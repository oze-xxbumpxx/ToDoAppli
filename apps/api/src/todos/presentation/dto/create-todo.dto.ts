import { IsISO8601, IsOptional, IsString, Length, MaxLength } from 'class-validator';

/**
 * docs/02-domain-and-api.md 2.3 の CreateTodoDto。
 *
 * ここは「HTTP で受け取れる形か」だけを見る。
 * 「同じタイトルが既にあるか」（F-09）はドメインの都合なので見ない。
 * 前者を破ると **400**、後者を破ると **422**（2.5）。この線引きが層の境界そのもの。
 *
 * status を受け取らないのは、新規作成が必ず 'todo' から始まるため。
 * DTO に無ければ、クライアントは 'done' の Todo を作りようがない。
 */
export class CreateTodoDto {
  @IsString()
  @Length(1, 120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsISO8601()
  dueDate?: string | null;
}
