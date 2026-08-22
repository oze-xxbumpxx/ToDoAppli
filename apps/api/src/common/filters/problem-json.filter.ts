import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DomainError, ResourceNotFoundError } from '../errors/domain-error';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: unknown;
}

/**
 * 例外を RFC 9457 (application/problem+json) に整形する。
 * 対応表は docs/02-domain-and-api.md 2.5。403 は使わない。
 */
@Catch()
export class ProblemJsonFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemJsonFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<{
      status(code: number): { type(t: string): { json(body: ProblemDetails): void } };
    }>();
    const request = http.getRequest<{ url?: string }>();
    const instance = request.url ?? '';

    const problem = this.toProblem(exception, instance);

    if (problem.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    response.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown, instance: string): ProblemDetails {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const detail =
        typeof body === 'string' ? body : ((body as { message?: unknown }).message ?? exception.message);
      return {
        type: `https://todoapli.example/probs/${slug(exception.name)}`,
        title: exception.name,
        status,
        detail: Array.isArray(detail) ? detail.join(', ') : String(detail),
        instance,
        ...(Array.isArray(detail) ? { errors: detail } : {}),
      };
    }

    // 404 — 他人のリソースもここに来る（存在有無を漏らさない）
    if (exception instanceof ResourceNotFoundError) {
      return {
        type: `https://todoapli.example/probs/${exception.code}`,
        title: exception.name,
        status: HttpStatus.NOT_FOUND,
        detail: exception.message,
        instance,
      };
    }

    // 422 — DTO は通ったが業務ルールに反する
    if (exception instanceof DomainError) {
      return {
        type: `https://todoapli.example/probs/${exception.code}`,
        title: exception.name,
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: exception.message,
        instance,
      };
    }

    return {
      type: 'https://todoapli.example/probs/internal-error',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      // 想定外の例外の中身はクライアントに返さない
      detail: '予期しないエラーが発生しました',
      instance,
    };
  }
}

function slug(name: string): string {
  return name
    .replace(/Exception$|Error$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}
