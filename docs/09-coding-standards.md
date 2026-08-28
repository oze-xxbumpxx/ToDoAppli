# 09. コーディング規約（決定 D-9）

**Google TypeScript Style Guide** に準拠する。
原典: <https://google.github.io/styleguide/tsguide.html>（2026-08-22 確認）

ただし NestJS / React Router の慣習と衝突する箇所が 2 つあるので、
そこは**例外として明示的に決める**（9.3）。曖昧なまま運用しない。

## 9.1 採用するルール

| # | ルール | 内容 |
|---|--------|------|
| G-1 | **default export 禁止** | 名前付き export のみ。「すべての import が同じ形になる」ため |
| G-2 | **`_` プレフィックス／サフィックス禁止** | private フィールドに `_` を付けない。`#private` も使わない（emit サイズと性能の劣化） |
| G-3 | **オブジェクト型は `interface`** | `type X = { ... }` ではなく `interface X { ... }` |
| G-4 | **`public` を書かない** | 既定なので冗長。例外は非 readonly のパラメータプロパティのみ |
| G-5 | **パラメータプロパティを使う** | `constructor(private readonly repo: TodoRepository) {}` |
| G-6 | **`readonly` を付ける** | コンストラクタ外で再代入しないプロパティすべて |
| G-7 | **`any` 禁止、`unknown` を使う** | `any` はプロパティ参照が無検査になる |
| G-8 | **`const enum` 禁止** | 素の `enum` を使う（JS 利用者から不可視になるため） |
| G-9 | **命名** | 型・クラス: `UpperCamelCase` ／ 変数・メソッド・プロパティ: `lowerCamelCase` ／ グローバル定数: `CONSTANT_CASE` |

### この設計との整合

- G-5 は NestJS の DI と完全に一致する（`constructor(@Inject(TODO_REPOSITORY) private readonly repo: TodoRepository)`）
- G-9 により `export const TODO_REPOSITORY = Symbol('TodoRepository')` は正しい（[04 の 4.4](./04-backend.md)）
- G-3 により `interface Todo { ... }`。ただし `type TodoStatus = 'todo' | 'doing' | 'done'` は
  オブジェクト型ではなく**ユニオン型**なので `type` のままでよい

## 9.2 D-3 の決定がひとつ衝突を消した

**D-3：React Router は data mode（`createBrowserRouter`）を採用**（→ [03](./03-frontend.md)）。

framework mode ではルートモジュールがコンポーネントを `export default` するのが慣習で、
これは **G-1（default export 禁止）と正面から衝突**する。

data mode ではルートをオブジェクト配列で定義し、コンポーネントは名前付きで import する:

```ts
const router = createBrowserRouter([
  {
    path: '/app/todos',
    element: <TodosLayout />,      // 名前付き import
    loader: todosLoader,
    children: [ /* ... */ ],
  },
]);
```

**default export がどこにも要らない。** G-1 を例外なしで適用できる。

## 9.3 例外（フレームワーク慣習を優先する箇所）

### 例外 1：ファイル名は snake_case にしない ★

| | 規約 | 例 |
|---|------|-----|
| Google | `snake_case` | `create_todo_usecase.ts` |
| **採用** | **kebab-case + ドット記法（NestJS 慣習）** | `create-todo.usecase.ts` |

**理由**：NestJS CLI（`nest g controller todos` 等）が生成するファイル名がドット記法。
Google 規約に合わせると **CLI の出力を毎回リネームすることになる**。
ファイル名規約は自動生成に乗るほうが実利が大きい。

Google のこの項目は社内ビルドシステムを前提にした規約であり、
外部プロジェクトで機械的に適用する価値が薄い部分。**ESLint で強制しない。**

### 例外 2：Entity をイミュータブルにして `_` を回避する ★

G-2（`_` 禁止）には実務上の困りごとがある。
「private フィールド + 同名の getter」が書けない:

```ts
private _status: TodoStatus;
get status() { return this._status; }   // ✗ G-2 違反
private status: TodoStatus;
get status() { ... }                    // ✗ そもそも名前が衝突して書けない
```

**解決：Entity を不変（イミュータブル）にする。**

```ts
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

これで 3 つが同時に満たされる:

- **G-2**：`_` が要らない
- **G-6**：全フィールドが `readonly`
- **設計原則**：`changeStatus()` を通さないと不正な状態遷移を作れない
  （「チェックを書く」のではなく「**通れない構造にする**」→ [04 の 4.8](./04-backend.md)）

**トレードオフ**：UseCase 側が再代入になる。

```ts
let todo = await this.repo.findById(ownerId, id);
if (!todo) throw new TodoNotFound(id);

if (cmd.title  !== undefined) todo = todo.rename(new TodoTitle(cmd.title));
if (cmd.status !== undefined) todo = todo.changeStatus(cmd.status);

await this.repo.save(todo);
```

`const` ではなく `let` になるが、Google 規約は「再代入しないなら `const`」であって
`let` を禁じてはいないので違反ではない。

### 例外 3：設定ファイルは default export を許す

`vitest.config.ts` / `vite.config.ts` は、**ローダーが default export を読む仕様**なので
G-1 を満たせない。名前付き export に変えると設定として認識されない。

対象を `*.config.ts` に限定して `no-restricted-syntax` を無効化する。
**例外を ESLint の設定に書く**ことが重要で、こうしておけば
「なんとなく例外」が増えていかない。例外を増やすには設定を触る必要がある。

> この例外は 2026-08-22、Phase 1 で実際に lint を走らせて発覚した。
> 設計時に予見できていなかったもので、規約は動かして初めて穴が見つかる例。

## 9.4 ESLint での強制

規約は**人間の記憶ではなく CI で守る**（→ [06 の 6.3](./06-infra-ci.md)）。

| ルール | 強制方法 |
|--------|---------|
| G-1 default export 禁止 | `import/no-default-export` |
| G-2 `_` 禁止 | `@typescript-eslint/naming-convention`（`leadingUnderscore: 'forbid'`） |
| G-3 interface 優先 | `@typescript-eslint/consistent-type-definitions: ['error', 'interface']` |
| G-4 `public` を書かない | `@typescript-eslint/explicit-member-accessibility`（`no-public`） |
| G-6 readonly | `@typescript-eslint/prefer-readonly` |
| G-7 `any` 禁止 | `@typescript-eslint/no-explicit-any` |
| G-8 `const enum` 禁止 | `no-restricted-syntax` |
| ファイル名 | **強制しない**（例外 1） |

### 層をまたぐ依存を ESLint で禁止する ★

[04 の 4.3](./04-backend.md) の依存の向きは、レビューではなく**機械で守る**。

```
domain/ から NestJS と Prisma の import を禁止
application/ から Prisma の import を禁止
```

`import/no-restricted-paths`（または `eslint-plugin-boundaries`）で設定する。

これがないと「UseCase がうっかり Prisma を import する」事故が必ず起きる。
アーキテクチャは**規約文書ではなく lint で保つ**もの。

## 9.5 実装時に確認すること

- 上表の ESLint ルール名は typescript-eslint のバージョンで変わりうる。設定時に公式ドキュメントで確認する
- Prettier と衝突する整形系ルール（行長 80 等）は Prettier に委ね、ESLint 側では無効化する
