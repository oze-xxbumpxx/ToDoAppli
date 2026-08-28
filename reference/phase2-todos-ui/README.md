# phase2-todos-ui — Phase 2 の手本（縦 1 本）

> **2026-08-28: この手本は役目を終えました。**
> 「Claude が書き、本人がレビューする」に方針変更したため、Phase 2 は
> `apps/web/src/` に**全部実装済み**です。実物のほうが広い（作成・更新・削除・
> 完了トグル・ページング・エラー表示まである）ので、読むなら `apps/web/src/` を
> 読んでください。レビュー観点は `apps/web/README.md` にあります。
> 以下は模写する前提で書かれた当時の文章です。

**読んで、手で打ち写すためのもの**です。`cp -R` で済ませると意味がありません
（docs/08-learning-method.md 8.1）。ビルドにも lint にも含まれません。

## 置き場所の対応

| 手本 | 写す先 |
|---|---|
| `main.tsx` | `apps/web/src/main.tsx`（既存のプレースホルダを置き換える） |
| `router.tsx` | `apps/web/src/router.tsx` |
| `auth/require-auth.loader.ts` | `apps/web/src/auth/` |
| `auth/login-page.tsx` | `apps/web/src/auth/` |
| `app/app-layout.tsx` | `apps/web/src/app/` |
| `todos/todos.loader.ts` | `apps/web/src/todos/` |
| `todos/todos-layout.tsx` | `apps/web/src/todos/` |
| `todos/todos-layout.module.css` | `apps/web/src/todos/` |
| `todos/todo-empty-state.tsx` | `apps/web/src/todos/` |

相対 import（`../lib/api-client` など）は、`apps/web/src/` に置いて初めて解決します。

## なぜ「一覧表示」が手本なのか

- `createBrowserRouter` → ネスト → loader → 描画という**全経路を通る**
- 認証ガード（3.4）も通る
- **副作用がない**ので、失敗しても何も壊れない

## 手本に含めていないもの（意図的な空欄）

| 箇所 | 空けた理由 |
|---|---|
| 詳細 `/app/todos/:todoId` | loader は一覧と同じ形。親が再実行されないことを自分で確かめる |
| 作成 `/app/todos/new` | **`Form` を選ぶ判断**が学習対象（8.2） |
| 削除 | 送信後にどこへ戻すかの判断 |
| 完了トグル | **`useFetcher` を選ぶ判断**。楽観的更新（3.3）も自力 |
| ページング | `page` を searchParams に載せるだけ。loader は変更不要 |
| エラー表示（`errorElement`） | 404 と 422 で出し分けが変わる。設計は 2.5 にある |

**`Form` と `useFetcher` の使い分けは手本を出しません。** 判断そのものが学習対象です。

## 見どころ（写しながら確認すること）

1. `todos.loader.ts` に「検索条件の useState」が**無い**こと。URL が状態
2. `require-auth.loader.ts` が `/app` に**1 か所だけ**あること。各ルートに書いていない
3. `router.tsx` が全部**名前付き import**（G-1）であること
4. `RouterProvider` の import 元が `react-router/dom` であること（`react-router` にも
   同名があり、間違えても動いてしまう）

## 検証済みであること

2026-08-27 に `apps/web/src/` へ実際に展開し、次まで確認済み:

- `typecheck` / `lint` / `vite build` が通る
- API（`pnpm dev`）と DB を上げた状態でブラウザから一覧が出る
- seed の user-002 の Todo が**混ざらない**（3 件中 3 件）
- `完了` で絞ると URL が `?status=done` になり、loader が再実行されて 1 件になる

写して動かない場合は、写し間違いを先に疑ってください。
