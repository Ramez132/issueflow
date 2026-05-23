import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, Req, ParseIntPipe, Query,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TicketStatus, TicketPriority, TicketType } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(
    @Body() body: {
      title: string;
      description?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      type: TicketType;
      projectId: number;
      assigneeId?: number;
      dueDate?: string;
    },
    @Req() req: any,
  ) {
    return this.ticketsService.create(body, req.user.id);
  }

  @Get()
  findByProject(@Query('projectId', ParseIntPipe) projectId: number) {
    return this.ticketsService.findByProject(projectId);
  }

  @Get('deleted')
  findDeleted(@Query('projectId', ParseIntPipe) projectId: number) {
    return this.ticketsService.findDeleted(projectId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      title?: string;
      description?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assigneeId?: number;
      dueDate?: string;
    },
    @Req() req: any,
  ) {
    return this.ticketsService.update(id, body, req.user.id);
  }

  @Post(':id/lock')
  lock(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.ticketsService.lock(id, req.user.id);
  }

  @Post(':id/unlock')
  unlock(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.ticketsService.unlock(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.ticketsService.remove(id, req.user.id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.ticketsService.restore(id, req.user.id);
  }

  @Post(':ticketId/dependencies')
  addDependency(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: { blockedBy: number },
  ) {
    return this.ticketsService.addDependency(ticketId, body.blockedBy);
  }

  @Get(':ticketId/dependencies')
  getDependencies(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.ticketsService.getDependencies(ticketId);
  }

  @Delete(':ticketId/dependencies/:blockerId')
  removeDependency(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('blockerId', ParseIntPipe) blockerId: number,
  ) {
    return this.ticketsService.removeDependency(ticketId, blockerId);
  }
}