import { Injectable, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../../prisma/prisma.service.js';
import { R2Client } from '../../lib/r2-client.js';
import { validateFile } from '../../lib/file-validator.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../constants/queues.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { QueryDocumentDto } from './dto/query-document.dto.js';

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Client: R2Client,
    private readonly cls: ClsService,
    @InjectQueue(QUEUE_NAMES.EMBEDDINGS)
    private readonly embeddingsQueue: Queue,
  ) {}

  async uploadDocument(dto: CreateDocumentDto, fileBuffer: Buffer) {
    const tenantId = this.cls.get<string>('tenantId');

    const validation = await validateFile(fileBuffer, dto.fileName);

    const { key, url } = await this.r2Client.uploadFile(
      fileBuffer,
      tenantId,
      dto.fileName,
      validation.mimeType,
    );

    const document = await this.prisma.db.knowledgeBaseDocument.create({
      data: {
        tenantId,
        title: dto.title,
        fileName: validation.fileName,
        fileSize: validation.fileSize,
        fileType: validation.mimeType,
        fileUrl: url,
        storagePath: key,
        checksum: validation.checksum,
        status: 'UPLOADING',
      },
    });

    await this.embeddingsQueue.add('generate-embeddings', {
      tenantId,
      documentId: document.id,
      fileUrl: document.fileUrl,
      title: document.title,
    });

    return document;
  }

  async listDocuments(query: QueryDocumentDto) {
    const tenantId = this.cls.get<string>('tenantId');
    const { page = 1, limit = 10, status } = query;

    const where = {
      tenantId,
      ...(status && { status }),
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.db.knowledgeBaseDocument.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.db.knowledgeBaseDocument.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDocument(id: string) {
    const tenantId = this.cls.get<string>('tenantId');
    const document = await this.prisma.db.knowledgeBaseDocument.findUnique({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Knowledge Base document not found');
    }

    return document;
  }

  async deleteDocument(id: string) {
    const tenantId = this.cls.get<string>('tenantId');
    await this.prisma.db.knowledgeBaseDocument.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
  }
}
