# 02. ドメインモデルと API 設計

## 2.1 ドメインモデル

```
┌─────────────────────┐
│ User                │  ← 実体は Cognito が持つ。DB には保存しない
├─────────────────────┤
│ sub (Cognito sub)   │  … 一意ID。JWT の sub クレーム
│ email               │
│ displayName         │
└─────────────────────┘
          │ 1
          │
          │ N
┌─────────────────────┐
│ Todo                │  ← アプリが所有する唯一のエンティティ
├─────────────────────┤
│ id: uuid            │
│ ownerId: string     │  … Cognito sub。認可の要
│ title: string       │
│ description: string?│
│ status: TodoStatus  │
│ dueDate: Date?      │
│ createdAt: Date     │
│ updatedAt: Date     │
└─────────────────────┘
```

### 設計判断：User テーブルを作らない

Cognito がユーザー情報の**信頼できる唯一の情報源（source of truth）**。
DB に User テーブルを作ると Cognito との同期問題（メール変更、退会）が発生する。
Todo は `ownerId` に Cognito の `sub` を文字列で持つだけにする。

> トレードオフ：「作成者の表示名を一覧に出す」ような機能を後から足すと、
> Cognito への問い合わせが必要になり N+1 になる。
> 今回は自分の Todo しか見えないので問題にならない、と判断した。

### 不変条件（invariant）

1. Todo は必ず `ownerId` を持つ。owner なしの Todo は存在しない。
2. `title` は 1〜120 文字。空文字は不可。
3. `status` は `todo` | `doing` | `done` の 3 値のみ。
4. **他人の Todo は取得も更新も削除もできない。**
5. **同一オーナーの未完了（`todo` / `doing`）Todo に、同じタイトルが 2 つ存在しない。**（F-09）

不変条件 4 の実装場所が最重要の設計判断 → 「2.4 認可の実装場所」参照。

不変条件 1〜3 は Todo 1 件の情報だけで判定できるので **Entity / 値オブジェクト**へ。
不変条件 5 は**他の Todo を見ないと判定できない**ので **Domain Service** へ。
振り分けの基準は [04 の 4.8](./04-backend.md)。

### 型定義

```ts
// ユニオン型なので type のまま（規約 G-3 の対象はオブジェクト型）
type TodoStatus = 'todo' | 'doing' | 'done';

// オブジェクト型は interface（規約 G-3 → 09-coding-standards.md）
interface Todo {
  readonly id: string;                  // uuid v7
  readonly ownerId: string;             // Cognito sub
  readonly title: string;               // 1..120
  readonly description: string | null;  // 0..2000
  readonly status: TodoStatus;
  readonly dueDate: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

全フィールドが `readonly` なのは Entity を不変にする決定によるもの
（→ [09 の 9.3 例外 2](./09-coding-standards.md)）。

## 2.2 エンドポイント一覧

ベースパス: `/api/v1`　全エンドポイントが認証必須。

| # | Method | Path | 用途 | 成功時 |
|---|--------|------|------|--------|
| 1 | GET | `/me` | ログイン中ユーザーの情報 | 200 |
| 2 | GET | `/todos` | 一覧（フィルタ・検索・ページング） | 200 |
| 3 | POST | `/todos` | 新規作成 | 201 + Location |
| 4 | GET | `/todos/:id` | 単体取得 | 200 |
| 5 | PATCH | `/todos/:id` | 部分更新 | 200 |
| 6 | DELETE | `/todos/:id` | 削除 | 204 |

### 設計判断：PUT ではなく PATCH

F-06「チェックボックスで完了トグル」は `status` だけを送りたい。
PUT（全置換）だと毎回 Todo 全体を送る必要があり、`useFetcher` での
楽観的更新と相性が悪い。部分更新の PATCH を採用する。

### 設計判断：`/todos` に owner のパスを含めない

`/users/:userId/todos` としない。理由は、**URL に userId を入れると
「他人の userId を入れたらどうなるか」を必ずテストしなければならなくなる**から。
JWT の `sub` からサーバが所有者を決めれば、そもそも指定する余地がない。
攻撃面を設計で消すほうが、認可チェックを書くより堅い。

## 2.3 DTO 設計

```ts
// リクエスト
CreateTodoDto {
  title: string;          // @IsString @Length(1, 120)
  description?: string;   // @IsOptional @IsString @MaxLength(2000)
  dueDate?: string;       // @IsOptional @IsISO8601
}

UpdateTodoDto {          // PartialType(CreateTodoDto) + status
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: TodoStatus;    // @IsOptional @IsEnum(TodoStatus)
}

ListTodosQueryDto {
  status?: TodoStatus;    // @IsOptional @IsEnum
  q?: string;             // @IsOptional @MaxLength(100)
  page?: number;          // @Type(() => Number) @IsInt @Min(1)   default 1
  limit?: number;         // @Type(() => Number) @IsInt @Max(100) default 20
}

// レスポンス
TodoResponseDto {
  id, title, description, status, dueDate, createdAt, updatedAt
}
// ★ ownerId はレスポンスに含めない（クライアントに不要な内部情報）

ListTodosResponseDto {
  items: TodoResponseDto[];
  page: number;
  limit: number;
  total: number;
}
```

### 設計判断：`ownerId` をレスポンスに含めない

自分の Todo しか返らないので `ownerId` は自明。返さないことで
「クライアントが ownerId を見て分岐する」実装を最初から不可能にする。

### 設計判断：バリデーションは class-validator に寄せる

zod で共通スキーマを作って NestJS とフロントで共有する案もあるが、**採用しない**。

- NestJS の標準は `class-validator` + `ValidationPipe`。標準から外れると案件レビューで説明コストがかかる
- 共有パッケージは「レスポンスの型定義だけ」に留める。バリデーションロジックは共有しない
- フロント側のバリデーションは UX のためのもので、サーバ側とは目的が違う。二重に書くのは冗長ではなく**正しい**

## 2.4 認可の実装場所 ★最重要

不変条件「他人の Todo にアクセスできない」を**どの層で保証するか**。

| 案 | 内容 | 評価 |
|----|------|------|
| A | Controller で `if (todo.ownerId !== user.sub) throw` | ✗ 書き忘れが 1 箇所でもあれば漏れる |
| B | UseCase で毎回チェック | △ A よりマシだが同じ問題 |
| C | **Repository が `ownerId` を必須引数に取る** | ◎ 型で強制できる |

**採用：C**

```ts
interface TodoRepository {
  findMany(ownerId: string, filter: TodoFilter): Promise<Paginated<Todo>>;
  findById(ownerId: string, id: string): Promise<Todo | null>;
  //       ^^^^^^^^ 省略できない
  findActiveByTitle(ownerId: string, title: TodoTitle): Promise<Todo | null>;  // F-09 用
  save(todo: Todo): Promise<void>;
  delete(ownerId: string, id: string): Promise<void>;
}
```

`ownerId` を渡さないとコンパイルが通らないので、**認可漏れが型エラーになる**。
実装は必ず `WHERE owner_id = $1 AND id = $2` を発行する。

副次効果：他人の ID を指定しても `findById` が `null` を返すので、
403 ではなく **404** を返すことになる。これは意図した挙動で、
「その ID の Todo が存在するかどうか」自体を漏らさない（列挙攻撃対策）。

## 2.5 エラー応答

形式は `application/problem+json`（RFC 9457）に寄せる。
NestJS の `HttpException` を ExceptionFilter で整形する。

```json
{
  "type": "https://example.com/probs/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "title must be between 1 and 120 characters",
  "instance": "/api/v1/todos",
  "errors": [{ "field": "title", "message": "..." }]
}
```

| Status | 発生条件 |
|--------|---------|
| 400 | DTO バリデーション違反 |
| 401 | JWT がない / 期限切れ / 署名不正 |
| 404 | 指定 ID の Todo が自分のものとして存在しない（他人のものも 404） |
| 422 | ドメインの不変条件違反（DTO は通ったが業務ルールに反する）。例: F-09 のタイトル重複 |
| 500 | 想定外 |

**403 は使わない。** 2.4 の設計により「権限がないリソース」は
そもそも見つからない（404）ため、403 が発生する経路がない。
