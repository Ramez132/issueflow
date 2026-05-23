import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { AttachmentsService } from './attachments.service';
import { CsvService } from './csv.service';
import { EscalationService } from './escalation.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, AttachmentsService, CsvService, EscalationService],
  exports: [TicketsService],
})
export class TicketsModule {}