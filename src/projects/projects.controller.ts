import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() body: { name: string; description?: string; ownerId: number }, @Req() req: any) {
    return this.projectsService.create(body, req.user.id);
  }

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('deleted')
  findDeleted() {
    return this.projectsService.findDeleted();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string },
    @Req() req: any,
  ) {
    return this.projectsService.update(id, body, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.projectsService.remove(id, req.user.id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.projectsService.restore(id, req.user.id);
  }

  @Get(':projectId/workload')
  getWorkload(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.getWorkload(projectId);
  }
}