# todos — ここはあなたが実装します

手本は `reference/phase1-list-todos/` にあります。
**手本を開いたまま貼り付けるのではなく、別ウィンドウで見ながらここに手で打ってください**
（docs/08-learning-method.md 8.5）。

## 手順

### 1. 模写 — 一覧取得の縦 1 本

`reference/phase1-list-todos/` の中身を、同じパス構成でこのディレクトリに書き写す。

```
todos/
  todos.module.ts
  presentation/
    todos.controller.ts
    dto/
      list-todos-query.dto.ts
      todo-response.dto.ts
  application/
    list-todos.usecase.ts
  domain/
    todo.entity.ts
    todo-title.vo.ts
    todo-status.ts
    todo.repository.ts
    todo.errors.ts
  infrastructure/
    prisma-todo.repository.ts
```

書き終わったら `src/app.module.ts` の `imports` に `TodosModule` を追加する。

**Phase 1 の完了条件**

```bash
curl -s http://localhost:3000/api/v1/todos -H "Authorization: Bearer $(pnpm -s token | tail -3 | head -1)"
```

が 200 を返すこと。

### 2. 手本を閉じて、横展開

ここからは手本なし。同じ形で書けるかどうかが理解度テストです。

| 横展開先 | 越える山 |
|---|---|
| `POST /todos` | `CreateTodoUseCase` / `CreateTodoDto` / F-09 の重複チェック |
| `GET /todos/:id` | `findById` に `ownerId` を渡す。他人のものは **404** |
| `PATCH /todos/:id` | 部分更新。Entity は不変なので `todo = todo.changeStatus(...)` |
| `DELETE /todos/:id` | 204 を返す |

### 3. Domain Service（F-09）

`domain/services/todo-title-uniqueness.checker.ts` を書く。
Create と Update の**両方から呼ばれる**のがポイント（docs/04-backend.md 4.8）。

`@Injectable()` は付けられません。domain 層は NestJS を import できないので
（ESLint が止めます）、`todos.module.ts` の `useFactory` で組み立てます。

## 詰まったら

手本を見てよいが、**見たことを記録する**。そこがあなたの弱点です。
