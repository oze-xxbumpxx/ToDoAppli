# web — Phase 2 はここから

配線（Vite / tsconfig / ESLint 接続 / API クライアント / トークン保管）は用意済みです。
**ここから先の画面・ルート・loader / action はあなたが書きます**（docs/08-learning-method.md 8.2）。

## 用意してあるもの（模写しない。設定は「調べて貼る」が実務でも正しい）

| ファイル | 役割 |
|---|---|
| `vite.config.ts` | dev サーバ。**プロキシを置いていない**理由はファイル内のコメント |
| `src/lib/token-store.ts` | アクセストークンをメモリだけに置く（決定 D-1） |
| `src/lib/api-client.ts` | Authorization 付与と problem+json → `ApiError` の変換のみ |
| `@todoapli/shared` | レスポンス型。`import type { TodoResponse } from '@todoapli/shared'` |

`api-client.ts` に「Todo を取得する関数」は**置いていません**。それは loader の仕事です
（docs/03-frontend.md 3.2）。ここに業務的な関数を足し始めると、React Router の
データ層を使わずに自前のデータ取得層を作ることになり、Phase 2 の学習目的が消えます。

## 手順

### 1. 模写 — 一覧表示の縦 1 本

手本は `reference/phase2-todos-ui/`（router 定義 → `/app/todos` の loader → 一覧描画）。
別ウィンドウで見ながら、`src/` に手で打つ。

### 2. 手本を閉じて、横展開

| 横展開先 | 越える山 |
|---|---|
| 詳細 `/app/todos/:todoId` | 子ルートの loader。親（一覧）が再実行されないことを確認する |
| 作成 `/app/todos/new` | `<Form method="post">` + action。送信後に**遷移する** |
| 削除 | 送信後のリダイレクト先を自分で決める |
| 完了トグル | **`useFetcher`**。遷移しないので `Form` ではない（docs/03 の 3.2） |

**`Form` と `useFetcher` の選択は手本を出しません。** そこが学習対象です（8.2）。

### 3. 起動

```bash
cp .env.example .env
```

API（`pnpm dev`）と DB（`pnpm db:up`）を先に上げてから `pnpm --filter @todoapli/web dev`。

Phase 4 まではログインが無いので、`pnpm token` で発行したトークンを手で貼る
仮ログイン画面を使います（手本に入れてあります。**Phase 4 で丸ごと捨てます**）。
