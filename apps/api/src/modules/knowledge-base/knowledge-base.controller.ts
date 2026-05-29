import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FastifyFileInterceptor } from '../../common/interceptors/fastify-file.interceptor.js';
import { UploadedFastifyFile } from '../../common/decorators/uploaded-fastify-file.decorator.js';
import type { UploadedFile } from '../../common/interceptors/fastify-file.interceptor.js';
import { ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '@whatsapp-ai/db/generated/prisma';
import { KnowledgeBaseService } from './knowledge-base.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { QueryDocumentDto } from './dto/query-document.dto.js';

@Controller('knowledge-base/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @UseInterceptors(new FastifyFileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadDocument(
    @UploadedFastifyFile() file: UploadedFile | null,
    @Body() dto: CreateDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.knowledgeBaseService.uploadDocument(dto, file.buffer);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async listDocuments(@Query() query: QueryDocumentDto) {
    return this.knowledgeBaseService.listDocuments(query);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async getDocument(@Param('id', ParseUUIDPipe) id: string) {
    return this.knowledgeBaseService.getDocument(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async deleteDocument(@Param('id', ParseUUIDPipe) id: string) {
    await this.knowledgeBaseService.deleteDocument(id);
  }
}
