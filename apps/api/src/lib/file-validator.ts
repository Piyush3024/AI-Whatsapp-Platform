// ============================================================
// Imports
// ============================================================
import { createHash } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';

// ============================================================
// Types
// ============================================================
export interface ValidationResult {
  isValid: boolean;
  fileName: string;
  fileSize: number; // Bytes
  fileType: string; // e.g., "application/pdf"
  checksum: string; // SHA-256 hash
  mimeType: string; // e.g., "application/pdf"
  extension: string; // e.g., "pdf"
}

// ============================================================
// Custom Errors
// ============================================================
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

// ============================================================
// Constants
// ============================================================
const ALLOWED_MIME_TYPES: string[] = (process.env.KB_ALLOWED_MIME_TYPES || '')
  .split(',')
  .map((type) => type.trim());

const MAX_FILE_SIZE_BYTES: number = Number(
  process.env.KB_MAX_FILE_SIZE_BYTES || 10_485_760, // Default: 10MB
);

// ============================================================
// Helper: Generate SHA-256 Checksum
// ============================================================
async function generateChecksum(buffer: Buffer): Promise<string> {
  return new Promise((resolve) => {
    const hash = createHash('sha256');
    hash.update(buffer);
    resolve(hash.digest('hex'));
  });
}

// ============================================================
// Helper: Detect File Type (MIME + Extension)
// ============================================================
async function getFileType(
  buffer: Buffer,
): Promise<{ mime: string; ext: string }> {
  const type = await fileTypeFromBuffer(buffer);
  if (!type) {
    throw new CorruptFileError('unknown');
  }
  return { mime: type.mime, ext: type.ext };
}

// ============================================================
// Main: Validate File
// ============================================================
export async function validateFile(
  buffer: Buffer,
  fileName: string,
): Promise<ValidationResult> {
  // 1. Check file size
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new FileTooLargeError(fileName, buffer.length, MAX_FILE_SIZE_BYTES);
  }

  // 2. Detect MIME type and extension
  const { mime, ext } = await getFileType(buffer);

  // 3. Check if MIME type is allowed
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw new InvalidFileError(fileName, mime);
  }

  // 4. Generate checksum for deduplication
  const checksum = await generateChecksum(buffer);

  // 5. Return validation result
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

// ============================================================
// Exports
// ============================================================
export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES };
