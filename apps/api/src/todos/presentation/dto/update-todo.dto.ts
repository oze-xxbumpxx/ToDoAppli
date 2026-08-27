import { IsIn, IsISO8601, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { TODO_STATUSES, type TodoStatus } from '../../domain/todo-status';

/**
 * docs/02-domain-and-api.md 2.3 の UpdateTodoDto。
 *
 * ★ `@IsOptional()` は **undefined と null の両方**を素通りさせる。
 *   ふつうは「null チェックが漏れている」に見えるが、ここでは**それが目的**。
 *
 *     { }                        → description は undefined → 変えない
 *     { "description": null }    → description は null      → 消す
 *     { "description": "abc" }   → 文字列として検証される
 *
 *   PartialType(CreateTodoDto) を使わず手で書いているのは、
 *   status を足すのと、この null 許容を型に見えるようにするため。
 */
export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsISO8601()
  dueDate?: string | null;

  @IsOptional()
  @IsIn([...TODO_STATUSES])
  status?: TodoStatus;
}
