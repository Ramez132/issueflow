import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; description?: string; ownerId: number }, actorId: number) {
    const project = await this.prisma.project.create({ data });

    await this.prisma.auditLog.create({
      data: { action: 'CREATE', entity: 'Project', entityId: project.id, actorId },
    });

    return project;
  }

  async findAll() {
    return this.prisma.project.findMany({
      where: { deletedAt: null },
      include: { owner: { select: { id: true, username: true, fullName: true } } },
    });
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: { owner: { select: { id: true, username: true, fullName: true } } },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async update(id: number, data: { name?: string; description?: string }, actorId: number) {
    await this.findOne(id);
    const project = await this.prisma.project.update({ where: { id }, data });

    await this.prisma.auditLog.create({
      data: { action: 'UPDATE', entity: 'Project', entityId: id, actorId, details: data },
    });

    return project;
  }

  async remove(id: number, actorId: number) {
    await this.findOne(id);
    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { action: 'DELETE', entity: 'Project', entityId: id, actorId },
    });

    return { message: 'Project deleted successfully' };
  }

  async findDeleted() {
    return this.prisma.project.findMany({
      where: { deletedAt: { not: null } },
    });
  }

  async restore(id: number, actorId: number) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!project) throw new NotFoundException(`Deleted project ${id} not found`);

    const restored = await this.prisma.project.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.prisma.auditLog.create({
      data: { action: 'RESTORE', entity: 'Project', entityId: id, actorId },
    });

    return restored;
  }

  async getWorkload(projectId: number) {
    await this.findOne(projectId);
    const tickets = await this.prisma.ticket.findMany({
      where: { projectId, deletedAt: null, status: { not: 'DONE' }, assigneeId: { not: null } },
      select: { assigneeId: true },
    });

    const countMap: Record<number, number> = {};
    for (const t of tickets) {
      if (t.assigneeId) countMap[t.assigneeId] = (countMap[t.assigneeId] || 0) + 1;
    }

    const users = await this.prisma.user.findMany({
      where: { role: 'DEVELOPER' },
      select: { id: true, username: true },
    });

    return users
      .map((u) => ({ userId: u.id, username: u.username, openTicketCount: countMap[u.id] || 0 }))
      .sort((a, b) => a.openTicketCount - b.openTicketCount);
  }
}