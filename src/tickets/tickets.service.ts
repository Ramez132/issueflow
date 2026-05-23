import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, TicketPriority, TicketType } from '@prisma/client';

const STATUS_ORDER: TicketStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  private statusIndex(s: TicketStatus) {
    return STATUS_ORDER.indexOf(s);
  }

  private async autoAssign(projectId: number): Promise<number | null> {
    const developers = await this.prisma.user.findMany({
      where: { role: 'DEVELOPER' },
      orderBy: { createdAt: 'asc' },
    });
    if (developers.length === 0) return null;

    const counts = await Promise.all(
      developers.map(async (dev) => {
        const count = await this.prisma.ticket.count({
          where: { projectId, assigneeId: dev.id, status: { not: 'DONE' }, deletedAt: null },
        });
        return { id: dev.id, count };
      }),
    );

    counts.sort((a, b) => a.count - b.count);
    return counts[0].id;
  }

  async create(
    data: {
      title: string;
      description?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      type: TicketType;
      projectId: number;
      assigneeId?: number;
      dueDate?: string;
    },
    actorId: number,
  ) {
    let assigneeId = data.assigneeId ?? null;
    let autoAssigned = false;

    if (!assigneeId) {
      assigneeId = await this.autoAssign(data.projectId);
      if (assigneeId) autoAssigned = true;
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        ...data,
        assigneeId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    await this.prisma.auditLog.create({
      data: { action: 'CREATE', entity: 'Ticket', entityId: ticket.id, actorId },
    });

    if (autoAssigned && assigneeId) {
      await this.prisma.auditLog.create({
        data: {
          action: 'AUTO_ASSIGN',
          entity: 'Ticket',
          entityId: ticket.id,
          actorId: null,
          actorType: 'SYSTEM',
          details: { assigneeId },
        },
      });
    }

    return ticket;
  }

  async findByProject(projectId: number) {
    return this.prisma.ticket.findMany({
      where: { projectId, deletedAt: null },
      include: { assignee: { select: { id: true, username: true, fullName: true } } },
    });
  }

  async findOne(id: number) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignee: { select: { id: true, username: true, fullName: true } },
        attachments: true,
      },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    return ticket;
  }

  async update(
    id: number,
    data: {
      title?: string;
      description?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assigneeId?: number;
      dueDate?: string;
    },
    actorId: number,
  ) {
    const ticket = await this.findOne(id);

    if (ticket.status === 'DONE') {
      throw new BadRequestException('Cannot update a DONE ticket');
    }

    if (ticket.lockedBy && ticket.lockedBy !== actorId) {
      throw new ConflictException('Ticket is being edited by another user');
    }

    if (data.status) {
      const currentIndex = this.statusIndex(ticket.status);
      const newIndex = this.statusIndex(data.status);
      if (newIndex <= currentIndex) {
        throw new BadRequestException('Status can only move forward in the lifecycle');
      }
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        isOverdue: data.priority ? false : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: { action: 'UPDATE', entity: 'Ticket', entityId: id, actorId, details: data },
    });

    return updated;
  }

  async lock(id: number, actorId: number) {
    const ticket = await this.findOne(id);
    if (ticket.lockedBy && ticket.lockedBy !== actorId) {
      throw new ConflictException('Ticket is being edited by another user');
    }
    return this.prisma.ticket.update({
      where: { id },
      data: { lockedBy: actorId, lockedAt: new Date() },
    });
  }

  async unlock(id: number, actorId: number) {
    return this.prisma.ticket.update({
      where: { id },
      data: { lockedBy: null, lockedAt: null },
    });
  }

  async remove(id: number, actorId: number) {
    await this.findOne(id);
    await this.prisma.ticket.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { action: 'DELETE', entity: 'Ticket', entityId: id, actorId },
    });

    return { message: 'Ticket deleted successfully' };
  }

  async findDeleted(projectId: number) {
    return this.prisma.ticket.findMany({
      where: { projectId, deletedAt: { not: null } },
    });
  }

  async restore(id: number, actorId: number) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!ticket) throw new NotFoundException(`Deleted ticket ${id} not found`);

    const restored = await this.prisma.ticket.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.prisma.auditLog.create({
      data: { action: 'RESTORE', entity: 'Ticket', entityId: id, actorId },
    });

    return restored;
  }

  async addDependency(ticketId: number, blockerId: number) {
    const [ticket, blocker] = await Promise.all([
      this.findOne(ticketId),
      this.findOne(blockerId),
    ]);

    if (ticket.projectId !== blocker.projectId) {
      throw new BadRequestException('Both tickets must belong to the same project');
    }

    return this.prisma.ticketDependency.create({
      data: { ticketId, blockerId },
    });
  }

  async getDependencies(ticketId: number) {
    return this.prisma.ticketDependency.findMany({
      where: { ticketId },
      include: { blocker: true },
    });
  }

  async removeDependency(ticketId: number, blockerId: number) {
    const dep = await this.prisma.ticketDependency.findUnique({
      where: { ticketId_blockerId: { ticketId, blockerId } },
    });
    if (!dep) throw new NotFoundException('Dependency not found');

    await this.prisma.ticketDependency.delete({
      where: { ticketId_blockerId: { ticketId, blockerId } },
    });

    return { message: 'Dependency removed' };
  }
}