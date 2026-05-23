import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    username: string;
    email: string;
    fullName: string;
    password: string;
    role?: Role;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: data.username }, { email: data.email }] },
    });
    if (existing) throw new ConflictException('Username or email already exists');

    const hashed = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: { ...data, password: hashed },
    });

    await this.prisma.auditLog.create({
      data: { action: 'CREATE', entity: 'User', entityId: user.id, actorId: user.id },
    });

    const { password, ...result } = user;
    return result;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, username: true, email: true, fullName: true, role: true, createdAt: true },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, fullName: true, role: true, createdAt: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(id: number, data: { fullName?: string; role?: Role }, actorId: number) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, fullName: true, role: true, createdAt: true },
    });

    await this.prisma.auditLog.create({
      data: { action: 'UPDATE', entity: 'User', entityId: id, actorId, details: data },
    });

    return user;
  }

  async remove(id: number, actorId: number) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: { action: 'DELETE', entity: 'User', entityId: id, actorId },
    });

    return { message: 'User deleted successfully' };
  }

  async getMentions(userId: number) {
    await this.findOne(userId);
    return this.prisma.mention.findMany({
      where: { userId },
      include: { comment: true },
      orderBy: { id: 'desc' },
    });
  }
}