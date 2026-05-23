import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async extractMentions(content: string): Promise<number[]> {
    const matches = content.match(/@(\w+)/g);
    if (!matches) return [];

    const usernames = matches.map((m) => m.slice(1).toLowerCase());
    const users = await this.prisma.user.findMany({
      where: { username: { in: usernames, mode: 'insensitive' } },
      select: { id: true },
    });

    return users.map((u) => u.id);
  }

  async create(data: { content: string; ticketId: number; authorId: number }, actorId: number) {
    const comment = await this.prisma.comment.create({ data });

    const mentionedIds = await this.extractMentions(data.content);
    if (mentionedIds.length > 0) {
      await this.prisma.mention.createMany({
        data: mentionedIds.map((userId) => ({ commentId: comment.id, userId })),
        skipDuplicates: true,
      });
    }

    await this.prisma.auditLog.create({
      data: { action: 'CREATE', entity: 'Comment', entityId: comment.id, actorId },
    });

    return this.findOne(comment.id);
  }

  async findByTicket(ticketId: number) {
    return this.prisma.comment.findMany({
      where: { ticketId },
      include: {
        author: { select: { id: true, username: true, fullName: true } },
        mentions: {
          include: { user: { select: { id: true, username: true, fullName: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, fullName: true } },
        mentions: {
          include: { user: { select: { id: true, username: true, fullName: true } } },
        },
      },
    });
    if (!comment) throw new NotFoundException(`Comment ${id} not found`);
    return comment;
  }

  async update(id: number, content: string, actorId: number) {
    const comment = await this.findOne(id);

    if (comment.lockedBy && comment.lockedBy !== actorId) {
      throw new ConflictException('Comment is being edited by another user');
    }

    const updated = await this.prisma.comment.update({
      where: { id },
      data: { content },
    });

    // Re-evaluate mentions
    await this.prisma.mention.deleteMany({ where: { commentId: id } });
    const mentionedIds = await this.extractMentions(content);
    if (mentionedIds.length > 0) {
      await this.prisma.mention.createMany({
        data: mentionedIds.map((userId) => ({ commentId: id, userId })),
        skipDuplicates: true,
      });
    }

    await this.prisma.auditLog.create({
      data: { action: 'UPDATE', entity: 'Comment', entityId: id, actorId },
    });

    return this.findOne(id);
  }

  async remove(id: number, actorId: number) {
    await this.findOne(id);
    await this.prisma.mention.deleteMany({ where: { commentId: id } });
    await this.prisma.comment.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: { action: 'DELETE', entity: 'Comment', entityId: id, actorId },
    });

    return { message: 'Comment deleted successfully' };
  }

  async lock(id: number, actorId: number) {
    const comment = await this.findOne(id);
    if (comment.lockedBy && comment.lockedBy !== actorId) {
      throw new ConflictException('Comment is being edited by another user');
    }
    return this.prisma.comment.update({
      where: { id },
      data: { lockedBy: actorId, lockedAt: new Date() },
    });
  }

  async unlock(id: number) {
    return this.prisma.comment.update({
      where: { id },
      data: { lockedBy: null, lockedAt: null },
    });
  }
}