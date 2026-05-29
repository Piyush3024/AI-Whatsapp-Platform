import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

export interface UploadResult {
  key: string;
  url: string;
}

export interface R2ClientConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

const KB_PREFIX = 'kb';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return s3Client;
}

function generateObjectKey(tenantId: string, fileName: string): string {
  const rawExtension = extname(fileName).slice(1) || 'bin';
  const extension =
    rawExtension.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'bin';
  const uuid = randomUUID();
  return `tenants/${tenantId}/${KB_PREFIX}/${uuid}.${extension}`;
}

export class R2Client {
  private readonly config: R2ClientConfig;

  constructor() {
    if (
      !process.env.R2_ENDPOINT ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_BUCKET_NAME ||
      !process.env.R2_PUBLIC_URL
    ) {
      throw new Error(
        'R2 configuration is missing. Check environment variables: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL',
      );
    }
    this.config = {
      endpoint: process.env.R2_ENDPOINT,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucketName: process.env.R2_BUCKET_NAME,
      publicUrl: process.env.R2_PUBLIC_URL.replace(/\/$/, ''),
    };
  }

  async uploadFile(
    fileBuffer: Buffer,
    tenantId: string,
    fileName: string,
    contentType: string,
  ): Promise<UploadResult> {
    const key = generateObjectKey(tenantId, fileName);
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });
    try {
      await client.send(command);
      return { key, url: `${this.config.publicUrl}/${key}` };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to upload KB document for tenant ${tenantId}: ${errorMessage}`,
      );
    }
  }

  async deleteFile(tenantId: string, fileKey: string): Promise<void> {
    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: fileKey,
    });
    try {
      await client.send(command);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to delete KB document for tenant ${tenantId} (key: ${fileKey}): ${errorMessage}`,
      );
    }
  }

  async fileExists(tenantId: string, fileKey: string): Promise<boolean> {
    const client = getS3Client();
    const command = new HeadObjectCommand({
      Bucket: this.config.bucketName,
      Key: fileKey,
    });
    try {
      await client.send(command);
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'NoSuchKey') {
        return false;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to check KB document existence for tenant ${tenantId} (key: ${fileKey}): ${errorMessage}`,
      );
    }
  }

  getFileUrl(fileKey: string): string {
    return `${this.config.publicUrl}/${fileKey}`;
  }

  async getPresignedUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: this.config.bucketName,
      Key: fileKey,
    });
    try {
      return await getSignedUrl(client, command, { expiresIn });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to generate presigned URL for key ${fileKey}: ${errorMessage}`,
      );
    }
  }
}

let r2ClientInstance: R2Client | null = null;

export function getR2Client(): R2Client {
  if (!r2ClientInstance) {
    r2ClientInstance = new R2Client();
  }
  return r2ClientInstance;
}
