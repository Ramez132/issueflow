import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, Req, ParseIntPipe, Query, UseInterceptors,
  UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TicketsService } from './tickets.service';
import { AttachmentsService } from './attachments.service';
import { CsvService } from './csv.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TicketStatus, TicketPriority, TicketType } from '@prisma/client';
import type { Response } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly attachmentsService: AttachmentsService,
    private readonly csvService: CsvService,
  ) {}

  @Post()
  create(
    @Body() body: {
      title: string; description?: string; status?: TicketStatus;
      priority?: TicketPriority; type: TicketType; projectId: number;
      assigneeId?: number; dueDate?: string;
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

  @Get('export')
  async exportCsv(@Query('projectId', ParseIntPipe) projectId: number, @Res() res: Response) {
    const csv = await this.csvService.exportTickets(projectId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tickets-${projectId}.csv"`);
    res.send(csv);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: string,
    @Req() req: any,
  ) {
    return this.csvService.importTickets(parseInt(projectId), file, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      title?: string; description?: string; status?: TicketStatus;
      priority?: TicketPriority; assigneeId?: number; dueDate?: string;
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

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  uploadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.attachmentsService.upload(id, file, req.user.id);
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