import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator.js';
import { PrismaService } from './prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(
      this.config.get<string>('redis.url') ?? 'redis://localhost:6379',
      { maxRetriesPerRequest: 1, connectTimeout: 2000, lazyConnect: true },
    );
  }

  @Get()
  @ApiOperation({ summary: 'Liveness probe — is the process alive?' })
  live(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe — DB, Redis, and process metrics',
  })
  async ready() {
    const start = Date.now();

    const [db, redis] = await Promise.allSettled([
      this._checkDb(),
      this._checkRedis(),
    ]);

    const allHealthy =
      db.status === 'fulfilled' && redis.status === 'fulfilled';

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      latency_ms: Date.now() - start,
      checks: {
        database: {
          status: db.status === 'fulfilled' ? 'ok' : 'error',
          ...(db.status === 'rejected' && {
            error: (db.reason as Error).message,
          }),
        },
        redis: {
          status: redis.status === 'fulfilled' ? 'ok' : 'error',
          ...(redis.status === 'rejected' && {
            error: (redis.reason as Error).message,
          }),
        },
      },
      process: {
        uptime_seconds: Math.floor(process.uptime()),
        memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        node_version: process.version,
        pid: process.pid,
      },
    };
  }

  private async _checkDb(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async _checkRedis(): Promise<void> {
    await this.redis.connect().catch(() => null);
    const pong = await this.redis.ping();
    if (pong !== 'PONG') throw new Error('Redis ping failed');
  }
}
