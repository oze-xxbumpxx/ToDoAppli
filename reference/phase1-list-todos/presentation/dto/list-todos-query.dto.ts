import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TODO_STATUSES, type TodoStatus } from '../../domain/todo-status';

/**
 * バリデーションは class-validator に寄せる（docs/02-domain-and-api.md 2.3）。
 * zod で共通スキーマを作ってフロントと共有する案は採らない。
 *
 * status は文字列ユニオンなので @IsEnum ではなく @IsIn を使う。
 */
export class ListTodosQueryDto {
  @IsOptional()
  @IsIn([...TODO_STATUSES])
  status?: TodoStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
