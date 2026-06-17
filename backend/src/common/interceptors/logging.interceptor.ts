import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/authenticated-request.type';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & Partial<AuthenticatedRequest>>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method, url } = req;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(
            JSON.stringify({
              method,
              url,
              statusCode: res.statusCode,
              duration,
              tenantId,
              userId,
            }),
          );
        },
        error: (err: unknown) => {
          const duration = Date.now() - start;
          const status = (err as { status?: number })?.status ?? 500;
          const message = (err as { message?: string })?.message ?? 'Unknown error';
          this.logger.error(
            JSON.stringify({
              method,
              url,
              statusCode: status,
              duration,
              tenantId,
              userId,
              error: message,
            }),
          );
        },
      }),
    );
  }
}
