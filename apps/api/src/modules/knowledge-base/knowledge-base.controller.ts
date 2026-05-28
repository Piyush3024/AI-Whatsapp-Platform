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
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.knowledgeBaseService.uploadDocument(
      dto,
      file.buffer,
      file.mimetype,
    );
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
