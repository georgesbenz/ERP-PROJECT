import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!WRITE_METHODS.has(req.method) || !req.user) return next.handle();

    const { userId, tenantId } = req.user;
    const action = req.method;
    const entity = req.path.split('/')[3] ?? 'unknown';

    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            const data = response && typeof response === 'object' ? (response as Record<string, unknown>)['data'] : null;
            const entityId = data && typeof data === 'object' ? ((data as Record<string, unknown>)['id'] as string) ?? '' : '';
            await this.prisma.auditLog.create({
              data: {
                tenantId,
                userId,
                action,
                entity,
                entityId,
                newValues: data as object,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
              },
            });
          } catch (e) {
            this.logger.warn('Audit log write failed', e);
          }
        },
      }),
    );
  }
}
