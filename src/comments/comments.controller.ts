import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, Req, ParseIntPipe,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: { content: string; authorId: number },
    @Req() req: any,
  ) {
    return this.commentsService.create({ ...body, ticketId }, req.user.id);
  }

  @Get()
  findByTicket(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.commentsService.findByTicket(ticketId);
  }

  @Patch(':commentId')
  update(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    return this.commentsService.update(commentId, body.content, req.user.id);
  }

  @Delete(':commentId')
  remove(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: any,
  ) {
    return this.commentsService.remove(commentId, req.user.id);
  }
}