import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: { create: jest.fn() },
  mention: { findMany: jest.fn() },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw if username or email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 1 });
      await expect(
        service.create({ username: 'ramez', email: 'r@r.com', fullName: 'Ramez', password: '123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return without password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1, username: 'ramez', email: 'r@r.com',
        fullName: 'Ramez', password: 'hashed', role: 'DEVELOPER', createdAt: new Date(),
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.create({
        username: 'ramez', email: 'r@r.com', fullName: 'Ramez', password: '123',
      });

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('findOne', () => {
    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});