import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator.js';

/**
 * Health check controller.
 *
 * Mounted at /health (excluded from the /api global prefix in main.ts).
 * Used by:
 *  - Docker HEALTHCHECK
 *  - Kubernetes liveness & readiness probes
 *  - Load balancer health checks (AWS ALB, Nginx, etc.)
 *
 * Returns 200 immediately — no auth, no throttling (@SkipThrottle is
 * handled by excluding this route from the global prefix, keeping it
 * outside the versioned API surface).
 *
 * NOTE: In Phase 4 we will upgrade this with @nestjs/terminus to perform
 * real database + Redis connectivity checks. For now, a 200 is sufficient
 * to verify the process is alive.
 */
@ApiTags('health')
@Public()
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  /**
   * Liveness probe — is the process alive?
   * Returns 200 with uptime and timestamp.
   */
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  check(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
