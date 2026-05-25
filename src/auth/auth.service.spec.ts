import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  auditLog: { create: jest.fn() },
  tokenDenyList: { create: jest.fn() },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock_token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token on valid credentials', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1, username: 'ramez', password: hashed,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.login('ramez', 'password123');
      expect(result.accessToken).toBe('mock_token');
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('nobody', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if password is wrong', async () => {
      const hashed = await bcrypt.hash('correctpass', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1, username: 'ramez', password: hashed,
      });
      await expect(service.login('ramez', 'wrongpass')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should add token to deny list', async () => {
      mockPrisma.tokenDenyList.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.logout('some_token', 1);
      expect(result.message).toBe('Logged out successfully');
      expect(mockPrisma.tokenDenyList.create).toHaveBeenCalledWith({
        data: { token: 'some_token', userId: 1 },
      });
    });
  });
});