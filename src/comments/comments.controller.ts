import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, Req, ParseIntPipe, Query,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @Body() body: { content: string; ticketId: number; authorId: number },
    @Req() req: any,
  ) {
    return this.commentsService.create(body, req.user.id);
  }

  @Get()
  findByTicket(@Query('ticketId', ParseIntPipe) ticketId: number) {
    return this.commentsService.findByTicket(ticketId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    return this.commentsService.update(id, body.content, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.commentsService.remove(id, req.user.id);
  }

  @Post(':id/lock')
  lock(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.commentsService.lock(id, req.user.id);
  }

  @Post(':id/unlock')
  unlock(@Param('id', ParseIntPipe) id: number) {
    return this.commentsService.unlock(id);
  }
}