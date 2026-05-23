import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TicketPriority } from '@prisma/client';

const PRIORITY_UP: Record<string, TicketPriority> = {
  LOW: 'MEDIUM',
  MEDIUM: 'HIGH',
  HIGH: 'CRITICAL',
};

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async escalateOverdueTickets() {
    this.logger.log('Running escalation check...');
    const now = new Date();

    const overdueTickets = await this.prisma.ticket.findMany({
      where: {
        dueDate: { lt: now },
        status: { not: 'DONE' },
        priority: { not: 'CRITICAL' },
        deletedAt: null,
      },
    });

    for (const ticket of overdueTickets) {
      const newPriority = PRIORITY_UP[ticket.priority];
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { priority: newPriority, isOverdue: true },
      });

      await this.prisma.auditLog.create({
        data: {
          action: 'ESCALATE',
          entity: 'Ticket',
          entityId: ticket.id,
          actorType: 'SYSTEM',
          details: { from: ticket.priority, to: newPriority },
        },
      });

      this.logger.log(`Escalated ticket ${ticket.id}: ${ticket.priority} -> ${newPriority}`);
    }

    // Mark CRITICAL overdue tickets
    await this.prisma.ticket.updateMany({
      where: {
        dueDate: { lt: now },
        status: { not: 'DONE' },
        priority: 'CRITICAL',
        isOverdue: false,
        deletedAt: null,
      },
      data: { isOverdue: true },
    });
  }
}