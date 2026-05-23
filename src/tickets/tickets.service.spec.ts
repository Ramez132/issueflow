import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  ticket: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  ticketDependency: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

describe('TicketsService', () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a ticket and auto-assign if no assigneeId', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 1, createdAt: new Date() }]);
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.ticket.create.mockResolvedValue({ id: 1, title: 'Test', assigneeId: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.create(
        { title: 'Test', type: 'BUG', projectId: 1 },
        1,
      );

      expect(result).toBeDefined();
      expect(mockPrisma.ticket.create).toHaveBeenCalled();
    });

    it('should use provided assigneeId without auto-assign', async () => {
      mockPrisma.ticket.create.mockResolvedValue({ id: 1, title: 'Test', assigneeId: 5 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.create(
        { title: 'Test', type: 'BUG', projectId: 1, assigneeId: 5 },
        1,
      );

      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw if ticket is DONE', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 1, status: 'DONE', lockedBy: null,
      });

      await expect(service.update(1, { title: 'New' }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if status moves backward', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 1, status: 'IN_REVIEW', lockedBy: null,
      });

      await expect(service.update(1, { status: 'TODO' }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update ticket successfully', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 1, status: 'TODO', lockedBy: null,
      });
      mockPrisma.ticket.update.mockResolvedValue({ id: 1, status: 'IN_PROGRESS' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.update(1, { status: 'IN_PROGRESS' }, 1);
      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if ticket not found', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should return ticket if found', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({ id: 1, title: 'Test' });
      const result = await service.findOne(1);
      expect(result.id).toBe(1);
    });
  });

  describe('addDependency', () => {
    it('should throw if tickets are in different projects', async () => {
      mockPrisma.ticket.findFirst
        .mockResolvedValueOnce({ id: 1, projectId: 1 })
        .mockResolvedValueOnce({ id: 2, projectId: 2 });

      await expect(service.addDependency(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should create dependency if same project', async () => {
      mockPrisma.ticket.findFirst
        .mockResolvedValueOnce({ id: 1, projectId: 1 })
        .mockResolvedValueOnce({ id: 2, projectId: 1 });
      mockPrisma.ticketDependency.create.mockResolvedValue({ id: 1, ticketId: 1, blockerId: 2 });

      const result = await service.addDependency(1, 2);
      expect(result).toBeDefined();
    });
  });
});