import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditAction } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(
    @Query('entity') entity?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: AuditAction,
  ) {
    return this.auditService.findAll({
      entity,
      actorId: actorId ? parseInt(actorId) : undefined,
      action,
    });
  }
}