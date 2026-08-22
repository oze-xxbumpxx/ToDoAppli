# 04. バックエンド設計（NestJS）

## 4.1 ディレクトリ構成

```
apps/api/src/
  main.ts
  app.module.ts
  common/
    guards/jwt-auth.guard.ts
    decorators/current-user.decorator.ts
    filters/problem-json.filter.ts
  auth/
    auth.module.ts
    jwt.strategy.ts
  todos/
    todos.module.ts
    presentation/
      todos.controller.ts
      dto/
        create-todo.dto.ts
        update-todo.dto.ts
        list-todos-query.dto.ts
        todo-response.dto.ts
    application/
      create-todo.usecase.ts
      list-todos.usecase.ts
      get-todo.usecase.ts
      update-todo.usecase.ts
      delete-todo.usecase.ts
    domain/
      todo.entity.ts              ← ドメインロジックの第一候補
      todo-title.vo.ts            ← 値オブジェクト
      todo-status.ts
      todo.repository.ts          ← interface（ポート）
      todo.errors.ts
      services/
        todo-title-uniqueness.checker.ts   ← F-09（Entity に置けない）
    infrastructure/
      prisma-todo.repository.ts   ← 実装（アダプタ）
```

`todos/` の中を presentation / application / domain / infrastructure に
割るのがこの設計の骨格。**機能で切ってから、その中を層で切る。**

## 4.2 各層の責務

### Controller（presentation）
HTTP の言語だけを扱う。ルーティング、ステータスコード、DTO 変換。

- **業務ロジックを書かない**
- `if` 文が増えてきたら設計ミスのサイン
- 理想は「DTO を受け取り、UseCase を呼び、結果を DTO に詰め直す」だけ

### UseCase（application）
1 ユースケース 1 クラス。public メソッドは `execute` ひとつ。

**責務はオーケストレーションのみ。** 具体的には「取得 → ドメインに委譲 → 保存」。

- トランザクション境界はここ
- **Repository の interface にのみ依存する**（Prisma を知らない）
- **業務ルールを書かない。** ドメインに委譲する（→ 4.8）
- クラス名がそのままユースケース名になるので、一覧を見れば仕様がわかる

```ts
async execute(ownerId: string, id: string, cmd: UpdateTodoCommand): Promise<Todo> {
  let todo = await this.repo.findById(ownerId, id);      // 取得
  if (!todo) throw new TodoNotFound(id);

  if (cmd.title !== undefined) {
    const title = new TodoTitle(cmd.title);
    await this.uniqueness.assertUnique(ownerId, title, todo.id);  // 委譲（Domain Service）
    todo = todo.rename(title);                                    // 委譲（Entity）
  }
  if (cmd.status !== undefined) {
    todo = todo.changeStatus(cmd.status);                         // 委譲（Entity）
  }

  await this.repo.save(todo);                            // 保存
  return todo;
}
```

`const` ではなく `let` なのは Entity を不変にしたため
（→ [09 の 9.3 例外 2](./09-coding-standards.md)）。

ここに `if (title.length > 120)` が現れたら設計が崩れている。
なお `if (cmd.title !== undefined)` は「どのフィールドが送られてきたか」の判定なので
業務ルールではなく**オーケストレーション側**。この線引きは意識しておく。

### Domain
フレームワーク非依存。**NestJS も Prisma も import しない。**
**業務ルールの本体はここ**（UseCase ではない）。

- `Todo` エンティティが自分の不変条件を守る（title の長さ、status の遷移規則）
- `TodoRepository` は interface だけを定義する
- Entity に置けないルールだけ `domain/services/` へ（→ 4.8）

### Infrastructure
外部技術に依存する実装。**Prisma を import してよい唯一の場所。**

## 4.3 依存の向き ★

```
  presentation        application            domain          infrastructure
 ┌────────────┐     ┌─────────────┐    ┌──────────────┐   ┌────────────────┐
 │ Controller │────>│   UseCase   │───>│ TodoRepository│<──│ PrismaTodoRepo │
 └────────────┘     └─────────────┘    │  (interface)  │   └────────────────┘
                                        └──────────────┘            │
                                               ▲                     │
                                               └── 依存が内側を向く ──┘
```

`PrismaTodoRepository` → `TodoRepository`（内向き）であって、
`TodoRepository` → Prisma ではない。これが**依存性逆転**。

実利：UseCase が Prisma を知らないので、テストで `InMemoryTodoRepository` に
差し替えられる。DB もモックライブラリも要らない。

## 4.4 DI トークン

interface は TypeScript の型なので、コンパイル後は実行時に存在しない。
つまり `@Inject(TodoRepository)` と書けない。Symbol トークンで解決する。

```ts
// domain/todo.repository.ts
export const TODO_REPOSITORY = Symbol('TodoRepository');
export interface TodoRepository { /* ... */ }

// todos.module.ts
providers: [
  { provide: TODO_REPOSITORY, useClass: PrismaTodoRepository },
  CreateTodoUseCase,
]

// application/create-todo.usecase.ts
constructor(
  @Inject(TODO_REPOSITORY) private readonly repo: TodoRepository,
) {}
```

**NestJS の DI で最もよく問われる応用パターン。案件で必ず出る。**
テストでは `useClass: InMemoryTodoRepository` に差し替えるだけでよい。

## 4.5 Repository の interface（認可の要）

設計判断 2.4 の実装形。`ownerId` を第一引数に強制する。

```ts
export interface TodoRepository {
  findMany(ownerId: string, filter: TodoFilter): Promise<Paginated<Todo>>;
  findById(ownerId: string, id: string): Promise<Todo | null>;
  save(todo: Todo): Promise<void>;
  delete(ownerId: string, id: string): Promise<void>;
}
```

`ownerId` を渡し忘れると**コンパイルエラーになる**＝認可漏れが型で防がれる。
実装は必ず `WHERE owner_id = $1 AND id = $2` を発行すること。

## 4.6 テスト戦略

| 層 | テスト種別 | 優先度 | 理由 |
|----|-----------|-------|------|
| Domain | 単体（依存なし） | **高** | **業務ロジックの本体。**一番安く一番効く |
| UseCase | 単体（InMemoryRepository） | 中 | 検証するのは呼び出し順序と分岐であって業務ルールではない |
| Controller | 任意 | 低 | 薄いので壊れにくい |
| Repository 実装 | 統合（Docker の PostgreSQL） | 中 | SQL の検証はここでしかできない |

ツールは Vitest。

Domain のテストが最優先なのは、業務ルールがそこにあるから（4.8）。
依存が一切ないので、`new Todo(...)` してメソッドを叩くだけで書ける。**最も安い。**

UseCase のテストがモック地獄にならないのは、**依存が Repository interface
ひとつだけ**だから。これが層を分ける実利であって、綺麗だからではない。

必ず書くテスト（認可の回帰防止）:
> 「別の ownerId で `findById` を呼ぶと `null` が返る」

## 4.7 データベース

PostgreSQL 16（Docker Compose）+ Prisma。

```sql
todos
  id          uuid        primary key    -- uuid v7
  owner_id    text        not null       -- Cognito sub
  title       varchar(120) not null
  description text        null
  status      text        not null       -- 'todo' | 'doing' | 'done'
  due_date    timestamptz null
  created_at  timestamptz not null
  updated_at  timestamptz not null
```

インデックス:
- `(owner_id, created_at desc)` … 一覧クエリ用
- `(owner_id, status)` … status フィルタ用

**両方とも先頭カラムが `owner_id`。** 全クエリが必ず owner_id で絞る
設計（4.5）なので、複合インデックスの先頭に置くのが正しい。

id に uuid v7 を使う理由：時系列にソート可能なので B-tree の挿入が
末尾に寄り、ランダムな uuid v4 よりインデックスの断片化が起きにくい。

## 4.8 ドメインロジックの置き場所 ★

> 2026-08-22 の議論で確定。「UseCase はオーケストレーションに徹する」という
> 方針に対し、**では業務ルールはどこに書くのか**を決めたもの。

### 二択ではなく三択

「UseCase か Service か」ではない。正しくは:

```
                   業務ルールの置き場所
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
   Entity / 値オブジェクト              Domain Service
   （第一候補・ほぼこれ）              （Entity に置けないものだけ）
```

UseCase は選択肢に入らない。UseCase は「取得 → 委譲 → 保存」の司会役。

### 判断基準

> **その業務ルールは、その Todo 1 件が持つ情報だけで判定できるか？**
> - YES → **Entity / 値オブジェクト**
> - NO（他の Todo や外部の情報が要る） → **Domain Service**

| 業務ルール | 判定に必要な情報 | 置き場所 |
|-----------|----------------|---------|
| title は 1〜120 文字 | その Todo だけ | `TodoTitle`（値オブジェクト） |
| status の遷移規則 | その Todo だけ | `Todo.changeStatus()` |
| `ownerId` は変更不可 | その Todo だけ | `Todo`（setter を作らない） |
| 1 ユーザー 100 件まで | **他の Todo の件数** | Domain Service |
| 同一タイトルの未完了 Todo を禁止 | **他の Todo** | Domain Service |

### なぜ Entity が第一候補なのか（貧血ドメインモデルの回避）

ドメインロジックを一律で Service に出すと、Entity がゲッター／セッターの袋になる。
これが **貧血ドメインモデル（Anemic Domain Model）**。

```ts
// ✗ 貧血：Todo はただのデータ。ルールが外にある
class Todo { title: string; status: string; }
class TodoService {
  changeStatus(todo: Todo, next: string) {
    if (todo.status === 'done' && next === 'doing') throw ...;
    todo.status = next;
  }
}

// ○ Todo が自分のルールを守る（不変・Google 規約準拠）
export class Todo {
  private constructor(
    readonly id: string,
    readonly ownerId: string,
    readonly title: TodoTitle,
    readonly status: TodoStatus,
    readonly dueDate: Date | null,
  ) {}

  changeStatus(next: TodoStatus): Todo {
    if (this.status === 'done' && next === 'doing') {
      throw new InvalidStatusTransition(this.status, next);
    }
    return new Todo(this.id, this.ownerId, this.title, next, this.dueDate);
  }
}
```

フィールドに `_` を付けず全部 `readonly` にしているのは
コーディング規約 G-2 / G-6 のため（→ [09 の 9.3 例外 2](./09-coding-standards.md)）。

貧血モデルは**レイヤーの形だけクリーンアーキテクチャで、中身は手続き型**になる。
案件で「なぜこの構造なのか」を説明するとき、一番答えに詰まる形。

コンストラクタを private にして `changeStatus()` しか公開しなければ、
**不正な状態遷移をそもそも書けなくなる**。
これは 2.4（Repository が `ownerId` を必須で取る）、3.4（認証ガードを親ルートに置く）と
同じ原則 ——「**チェックを書く**」のではなく「**通れない構造にする**」。

### Domain Service の書き方

ドメイン層に置き、依存してよいのは**ドメイン自身のポート（Repository interface）まで**。
NestJS も Prisma も import しない。

```ts
// domain/services/todo-title-uniqueness.checker.ts
export class TodoTitleUniquenessChecker {
  constructor(private readonly repo: TodoRepository) {}   // interface にのみ依存

  /** @param excludeId 更新時に自分自身を重複扱いしないための除外 ID */
  async assertUnique(
    ownerId: string,
    title: TodoTitle,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.repo.findActiveByTitle(ownerId, title);
    if (existing && existing.id !== excludeId) {
      throw new DuplicateTodoTitle(title);   // → HTTP 422
    }
  }
}
```

**この例が Domain Service として良い教材である理由**：
`CreateTodoUseCase` と `UpdateTodoUseCase` の**両方から呼ばれる**。
UseCase に直接書くと同じルールが 2 箇所に複製され、
片方だけ直すバグが生まれる。**これが Domain Service の存在理由そのもの。**

`excludeId` があるのは、更新時に「自分自身」を重複と誤判定しないため。
この手の細部は実装して初めて気づくので、練習の価値がある。

### 命名：`XxxService` を避ける ★

NestJS が `nest g service todos` で生成する `TodosService` は**アプリケーション層**の
ものであり、ドメイン層の Service とは別物。同じ「Service」という語を
両方で使うと、読む人が確実に混同する。

| 方針 | 内容 |
|------|------|
| 推奨 | **ルール名で命名する**。`TodoLimitPolicy` / `TodoTitleDuplicationChecker` |
| 可 | `domain/services/` に置き、場所で層を示す |
| 禁止 | `TodosService` という名前を使う（UseCase に分割済みなので、そもそも不要） |

### 決定 D-8：練習のため要件を 1 つ追加した

当初の要件 F-01〜F-08 には、**Domain Service が必要なルールがひとつもなかった**。
すべて Entity と値オブジェクトに収まってしまう。

レイヤーを先に作って中身を探すのは順序が逆なので、
「Domain Service を書く」ために**業務ルールのほうを 1 つ足した**（2026-08-22）。

> **F-09：同一オーナーの未完了（`todo` / `doing`）Todo に、同じタイトルを 2 つ作れない**

このルールを選んだ理由:

1. **Entity に置けないことが明白** — 他の Todo を見ないと判定できない
2. **2 つの UseCase から呼ばれる** — Create と Update の両方。
   Domain Service にしないと重複するので、存在理由が実感できる
3. **完了済みは重複可**という条件があるので、`WHERE status IN ('todo','doing')` という
   ドメインの都合がそのまま Repository のメソッドに現れる

これ以外の Domain Service は作らない。`domain/services/` にファイルは 1 つだけ。

### 案件の慣習が優先

9 月の案件が「**Service = 業務ロジックの置き場**」という規約で書かれているなら、
**そちらに合わせる。** D-2 / D-3 と同じ理由で、この設計の目的は
「なぜそう作ったかを説明できること」なので、案件と異なる構造を採ると
説明コストが増えるだけになる。
