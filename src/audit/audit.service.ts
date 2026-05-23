import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { entity?: string; actorId?: number; action?: AuditAction }) {
    return this.prisma.auditLog.findMany({
      where: {
        entity: filters.entity,
        actorId: filters.actorId,
        action: filters.action,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, username: true, fullName: true } },
      },
    });
  }
}