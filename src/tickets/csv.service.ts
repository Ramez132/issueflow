import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStatus, TicketPriority, TicketType } from '@prisma/client';
import * as fastCsv from 'fast-csv';
import { Readable } from 'stream';

@Injectable()
export class CsvService {
  constructor(private readonly prisma: PrismaService) {}

  async exportTickets(projectId: number): Promise<string> {
    const tickets = await this.prisma.ticket.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true, title: true, description: true,
        status: true, priority: true, type: true, assigneeId: true,
      },
    });

    return new Promise((resolve, reject) => {
      const rows: string[] = [];
      const stream = fastCsv.format({ headers: true });
      stream.on('data', (chunk) => rows.push(chunk.toString()));
      stream.on('end', () => resolve(rows.join('')));
      stream.on('error', reject);
      tickets.forEach((t) => stream.write(t));
      stream.end();
    });
  }

  async importTickets(
    projectId: number,
    file: Express.Multer.File,
    actorId: number,
  ): Promise<{ created: number; failed: number; errors: string[] }> {
    const results = { created: 0, failed: 0, errors: [] as string[] };

    const rows: any[] = await new Promise((resolve, reject) => {
      const data: any[] = [];
      const stream = Readable.from(file.buffer.toString());
      fastCsv.parseStream(stream, { headers: true })
        .on('data', (row) => data.push(row))
        .on('end', () => resolve(data))
        .on('error', reject);
    });

    for (const row of rows) {
      try {
        if (!row.title || !row.type) throw new Error('Missing required fields: title, type');
        if (!['BUG', 'FEATURE', 'TECHNICAL'].includes(row.type)) {
          throw new Error(`Invalid type: ${row.type}`);
        }

        await this.prisma.ticket.create({
          data: {
            title: row.title,
            description: row.description || null,
            status: (row.status as TicketStatus) || 'TODO',
            priority: (row.priority as TicketPriority) || 'MEDIUM',
            type: row.type as TicketType,
            projectId,
            assigneeId: row.assigneeId ? parseInt(row.assigneeId) : null,
          },
        });
        results.created++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(e.message);
      }
    }

    return results;
  }
}