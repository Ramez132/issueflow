import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwt.sign({ sub: user.id, username: user.username });

    await this.prisma.auditLog.create({
      data: { action: 'LOGIN', entity: 'User', entityId: user.id, actorId: user.id },
    });

    return { accessToken: token, tokenType: 'Bearer', expiresIn: 86400 };
  }

  async logout(token: string, userId: number) {
    await this.prisma.tokenDenyList.create({ data: { token, userId } });
    await this.prisma.auditLog.create({
      data: { action: 'LOGOUT', entity: 'User', entityId: userId, actorId: userId },
    });
    return { message: 'Logged out successfully' };
  }

  async me(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, email: true,
        fullName: true, role: true, createdAt: true,
      },
    });
  }
}