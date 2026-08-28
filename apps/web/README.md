# web — Phase 2

## いまの状態（2026-08-28）

| | 誰が書いたか |
|---|---|
| 配線（Vite / tsconfig / ESLint 接続 / `lib/api-client.ts` / `lib/token-store.ts`） | **Claude**（模写対象外。設定は「調べて貼る」が実務でも正しい） |
| 画面・ルート・loader / action の**全部**（一覧・詳細・作成・更新・削除・完了トグル） | **Claude**（2026-08-28 の方針決定。あなたはレビュー側） |

> 当初は「一覧の縦 1 本を模写 → 横展開は自力、`Form` と `useFetcher` の判断は手本を出さない」
> という計画でした（docs/08-learning-method.md 8.2）。9/1 の日程が押したため、
> Phase 1 と同じく **「Claude が書き、本人が読んでレビューする」** に変更しています。
> 理解度は「書けるか」ではなく **レビューで指摘できるか**で取ります。
>
> 手本 `reference/phase2-todos-ui/` は**役目を終えました**。`apps/web/src/` の実物のほうが
> 広いので、読むならそちらを読んでください。

## ファイルの地図

| ファイル | 役割 |
|---|---|
| `src/router.tsx` | ルート定義。ネストと errorElement の置き場所がそのまま設計（3.1 / 3.6） |
| `src/auth/require-auth.loader.ts` | 認証ガード。`/app` に **1 か所だけ**（3.4） |
| `src/auth/login-page.tsx` | 仮ログイン。**Phase 4 で丸ごと捨てる** |
| `src/app/app-layout.tsx` | ヘッダ + `<Outlet />` |
| `src/app/route-error-boundary.tsx` | 401 / 404 / それ以外の出し分け（2.5） |
| `src/todos/todos.loader.ts` | 一覧取得。**検索条件は URL**（3.2） |
| `src/todos/todos-layout.tsx` | 左ペイン一覧・絞り込み `Form`・ページング |
| `src/todos/todo-list-item.tsx` | **完了トグル = `useFetcher` + 楽観的更新**（3.3） |
| `src/todos/todo-detail.loader.ts` | 詳細取得。404 は投げて errorElement へ |
| `src/todos/todo-detail-page.tsx` | **編集 = `useFetcher` / 削除 = `Form`**。同じ action を呼び分ける |
| `src/todos/todo-new-page.tsx` | **作成 = `Form`**。成功で詳細へ遷移 |
| `src/todos/todo.actions.ts` | POST / PATCH / DELETE。**400・422 は返す、404・401 は投げる** |
| `src/todos/todo-status.ts` | 状態の表示名。`Record<TodoStatus, string>` で網羅性を型に見せている |

## レビューで見るところ（docs/08-learning-method.md 8.5）

「動くか」ではなく「**設計通りか**」を見てください。

- [ ] `Form` と `useFetcher` の選択が「送信後に別の画面へ行くか」で説明できるか（[03 の 3.2](../../docs/03-frontend.md)）
- [ ] 検索・絞り込み・ページングの状態が `useState` ではなく **URL** にあるか（3.2）
- [ ] 認証チェックが `/app` の 1 か所だけで、各ルートに散っていないか（3.4）
- [ ] `lib/api-client.ts` に業務的な関数（`fetchTodos()` 等）が生えていないか。
      データ取得は loader / action の仕事（3.2）
- [ ] 400 / 422 と 404 / 401 の扱いが分かれているか（[02 の 2.5](../../docs/02-domain-and-api.md)）
- [ ] 「送信中」「通信中」を `useState` で持っている箇所が 1 つも無いか（3.3 / 3.5）

### 特に説明できるようにしておくもの

| 場所 | 問い |
|---|---|
| `todo-list-item.tsx` | なぜ行ごとにコンポーネントを分けたのか（fetcher を 1 つ共有すると何が壊れるか） |
| `todo-list-item.tsx` の hidden input | なぜ「完了を外す」先が `doing` ではなく `todo` なのか |
| `todo-detail-page.tsx` の `key={todo.id}` | key を外すと、別の Todo に切り替えたとき何が起きるか |
| `todo.actions.ts` の `toUpdateBody()` | なぜ `Object.fromEntries(form)` で済ませてはいけないのか |
| `todo.actions.ts` の `toFormError()` | なぜ 422 は**返し**、401 は**投げる**のか |
| `router.tsx` の errorElement 3 か所 | 詳細の 404 で一覧が消えないのはなぜか |
| `todos-layout.tsx` の絞り込み `Form` | なぜ `page` を hidden で持ち回していないのか |

## 動作確認済みのこと（2026-08-28、実際にブラウザで確認）

| 確認 | 結果 |
|---|---|
| 未ログインで `/app/todos` | `/login?from=...` にリダイレクト（3.4） |
| 一覧 | user-001 の 3 件のみ。user-002 の Todo は混ざらない |
| 完了トグル（`useFetcher`） | 遷移せず、一覧が再検証されて確定 |
| 作成（`Form`） | 201 → **詳細へ遷移**し、左の一覧も 4 件に更新 |
| 作成で重複タイトル | 画面はそのまま、**422 のメッセージだけ表示**（入力は残る） |
| 編集（`useFetcher`） | URL も履歴も変わらず、左の一覧のタイトル・状態が更新 |
| 完了 → 進行中 | 422「status を done から doing へは変更できません」 |
| 削除（`Form`） | 204 → 一覧へ遷移。絞り込み条件は保たれる |
| 削除した Todo へブラウザバック | 右ペインだけ「見つかりません」。**左の一覧は生きたまま** |
| 絞り込み | URL が `?status=done` になり loader が再実行される |
| ページング（22 件で確認後に削除） | `?page=2` で 2 ページ目。**loader は 1 行も変えずに動く** |
| リロード | トークンが消えて `/login` へ。メモリ保管（D-1）の代償が実際に出る |

## まだ無いもの（意図的）

- **`dueDate` のタイムゾーン**。ISO 文字列の先頭 10 文字を `input[type=date]` に渡しているので、
  UTC 基準。日本時間の深夜だと 1 日ずれる。Phase 2 では割り切っている
- **一覧の楽観的更新はトグルのみ**。作成・削除は API 応答を待つ
- **テスト**。Vitest + Testing Library はまだ入れていない（CI も web は typecheck / build のみ）

## 起動

```bash
cp .env.example .env
```

API（`pnpm dev`）と DB（`pnpm db:up`）を先に上げてから `pnpm dev:web`。

Phase 4 まではログインが無いので、`pnpm run token` で発行したトークンを手で貼る
仮ログイン画面を使います（**Phase 4 で丸ごと捨てます**）。
