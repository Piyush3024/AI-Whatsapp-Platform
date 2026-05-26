import { createHash } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';

export interface ValidationResult {
  isValid: boolean;
  fileName: string;
  fileSize: number;
  fileType: string;
  checksum: string;
  mimeType: string;
  extension: string;
}

export class FileTooLargeError extends Error {
  constructor(fileName: string, fileSize: number, maxSize: number) {
    super(
      `File "${fileName}" is too large (${fileSize} bytes). Max allowed: ${maxSize} bytes.`,
    );
    this.name = 'FileTooLargeError';
  }
}

export class InvalidFileError extends Error {
  constructor(fileName: string, mimeType: string) {
    super(
      `File "${fileName}" has unsupported MIME type: ${mimeType}. Allowed: ${process.env.KB_ALLOWED_MIME_TYPES}.`,
    );
    this.name = 'InvalidFileError';
  }
}

export class CorruptFileError extends Error {
  constructor(fileName: string) {
    super(`File "${fileName}" is corrupt or has an unrecognizable format.`);
    this.name = 'CorruptFileError';
  }
}

const ALLOWED_MIME_TYPES: string[] = (process.env.KB_ALLOWED_MIME_TYPES || '')
  .split(',')
  .map((type) => type.trim());

const MAX_FILE_SIZE_BYTES: number = Number(
  process.env.KB_MAX_FILE_SIZE_BYTES || 10_485_760,
);
async function generateChecksum(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    const hash = createHash('sha256');
    hash.update(buffer);
    resolve(hash.digest('hex'));
  });
}

async function getFileType(
  buffer: Buffer,
): Promise<{ mime: string; ext: string }> {
  const type = await fileTypeFromBuffer(buffer);
  if (!type) {
    throw new CorruptFileError('unknown');
  }
  return { mime: type.mime, ext: type.ext };
}

export async function validateFile(
  buffer: Buffer,
  fileName: string,
): Promise<ValidationResult> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new FileTooLargeError(fileName, buffer.length, MAX_FILE_SIZE_BYTES);
  }

  const { mime, ext } = await getFileType(buffer);

  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw new InvalidFileError(fileName, mime);
  }
  const checksum = await generateChecksum(buffer);

  return {
    isValid: true,
    fileName,
    fileSize: buffer.length,
    fileType: mime,
    checksum,
    mimeType: mime,
    extension: ext,
  };
}

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES };
