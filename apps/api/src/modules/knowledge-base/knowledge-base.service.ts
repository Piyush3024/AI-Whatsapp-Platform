// ============================================================
// Imports
// ============================================================
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

// ============================================================
// Service
// ============================================================
@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Client: R2Client,
    private readonly cls: ClsService,
    @InjectQueue(QUEUE_NAMES.EMBEDDINGS)
    private readonly embeddingsQueue: Queue,
  ) {}

  // ==========================================================
  // Upload Document
  // ==========================================================
  async uploadDocument(
    dto: CreateDocumentDto,
    fileBuffer: Buffer,
    mimeType: string,
  ) {
    const tenantId = this.cls.get<string>('tenantId');

    // 1. Validate file
    const validation = await validateFile(fileBuffer, dto.fileName);

    // 2. Upload to R2
    const { key, url } = await this.r2Client.uploadFile(
      fileBuffer,
      tenantId,
      dto.fileName,
      mimeType,
    );

    // 3. Create DB record
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

    // 4. Queue embedding job
    await this.embeddingsQueue.add('generate-embeddings', {
      tenantId,
      documentId: document.id,
      fileType: document.fileType,
      storagePath: document.storagePath,
    });

    return document;
  }

  // ==========================================================
  // List Documents
  // ==========================================================
  async listDocuments(query: QueryDocumentDto) {
    const tenantId = this.cls.get<string>('tenantId');
    const { page = 1, limit = 10, status } = query;

    return this.prisma.db.knowledgeBaseDocument.findMany({
      where: {
        tenantId,
        ...(status && { status }),
        deletedAt: null,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================================
  // Get Single Document
  // ==========================================================
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

  // ==========================================================
  // Delete Document
  // ==========================================================
  async deleteDocument(id: string) {
    const tenantId = this.cls.get<string>('tenantId');
    await this.prisma.db.knowledgeBaseDocument.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
  }
}
