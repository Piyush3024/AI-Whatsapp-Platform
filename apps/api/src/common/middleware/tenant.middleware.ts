import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly cls: ClsService,
    private readonly jwt: JwtService,
  ) {}

  use(
    req: import('http').IncomingMessage,
    _res: import('http').ServerResponse,
    next: () => void,
  ): void {
    const authHeader = req.headers['authorization'];

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      try {
        const payload = this.jwt.decode<{
          sub: string;
          tenantId: string;
          role: string;
        }>(token);

        if (payload?.tenantId) {
          this.cls.set('tenantId', payload.tenantId);
          this.cls.set('userId', payload.sub);
          this.cls.set('userRole', payload.role);
        }
      } catch {
        // Invalid token format — let JwtAuthGuard handle rejection
      }
    }

    next();
  }
}
