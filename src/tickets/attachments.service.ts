import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(
    ticketId: number,
    file: Express.Multer.File,
    actorId: number,
  ) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    const attachment = await this.prisma.attachment.create({
      data: {
        ticketId,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: filepath,
      },
    });

    await this.prisma.auditLog.create({
      data: { action: 'CREATE', entity: 'Attachment', entityId: attachment.id, actorId },
    });

    return attachment;
  }
}