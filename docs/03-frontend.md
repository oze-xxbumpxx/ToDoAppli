# 03. フロントエンド設計（React Router）

> **決定 D-3（2026-08-22）：data mode（`createBrowserRouter`）を採用する。**
> framework mode（`routes.ts` + Vite プラグイン + 型自動生成）は使わない。
>
> 理由:
> 1. NestJS を別に立てる純粋な SPA なので、framework mode のサーバ側機能を使わない
> 2. framework mode の `ssr: false` は `loader`/`action` ではなく
>    `clientLoader`/`clientAction` を使う必要があり、学習対象が増える。
>    data mode なら `loader`/`action` がそのままブラウザで動く
> 3. ルートモジュールの `export default` 慣習が
>    コーディング規約 G-1（default export 禁止）と衝突する（→ [09 の 9.2](./09-coding-standards.md)）
>
> 練習対象の `loader` / `action` / `Form` / `useFetcher` / Nested Routes は
> **data mode ですべて使える**。失うものがない。

## 3.1 ルート構成

```
/                          → /app/todos へリダイレクト
/login                     → ログイン画面（未認証専用）
/auth/callback             → Cognito からの戻り先。code → token 交換
/app                       ← 認証ガード用レイアウトルート
  ├ index                  → /app/todos へリダイレクト
  ├ /app/todos             ← 一覧レイアウト（左ペインに一覧を描画）
  │   ├ index              → 「Todo を選択してください」プレースホルダ
  │   ├ /app/todos/new     → 新規作成フォーム（右ペイン）
  │   └ /app/todos/:todoId → 詳細・編集（右ペイン）
  └ /app/settings          → Passkey 管理・ログアウト
```

### なぜこのネストなのか（Nested Routes の本質）

```
┌─ /app ──────────────────────────────────────┐
│  ヘッダー / ナビ（ユーザー名・ログアウト）    │
│ ┌─ /app/todos ─────────────────────────────┐│
│ │ ┌── 左ペイン ──┐ ┌──── 右ペイン ───────┐││
│ │ │ Todo 一覧    │ │  <Outlet />         │││
│ │ │ ・買い物  ✓  │ │   ↑ 子ルートがここ  │││
│ │ │ ・レポート   │ │     に描画される     │││
│ │ │ ・電話       │ │                     │││
│ │ └──────────────┘ └─────────────────────┘││
│ └──────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

`/app/todos/1` → `/app/todos/2` と遷移したとき、
**親 `/app/todos` の loader は再実行されない**。左ペインの一覧はそのまま、
右ペインだけが差し替わる。これが Nested Routes の実利。

もしフラットなルート構成にすると、詳細に移るたびに一覧を取り直すか、
一覧をグローバル state に退避する羽目になる。**ルート構造で解決している**。

## 3.2 loader / action / Form / useFetcher の使い分け ★核心

| 機能 | 使う仕組み | なぜそれか |
|------|-----------|-----------|
| F-03 一覧取得 | `/app/todos` の loader | URL に紐づくデータ。検索条件は searchParams に置く |
| F-03 検索・フィルタ | `<Form method="get">` | GET なので URL が変わる → loader が自動で再実行される |
| F-05 詳細取得 | `/app/todos/:todoId` の loader | 同上 |
| F-04 新規作成 | `<Form method="post">` + action | 送信後に詳細画面へ**遷移する** |
| F-07 削除 | `<Form>` + action | 送信後に一覧へ**戻る** |
| F-06 完了トグル | **useFetcher** | 一覧に留まったまま更新したい＝**遷移しない** |
| インライン編集 | **useFetcher** | 同上 |

### Form と useFetcher の違い（この 1 行が答え）

> `Form` は「送信 → ナビゲーション → loader 再検証」というブラウザ本来の動作をなぞる。
> `useFetcher` は同じことを**ナビゲーションなしで**やる。

だから「送信した結果、別の画面に行くか？」で選べばよい。

- 新規作成 → 作った Todo の詳細に行きたい → **Form**
- チェックボックス → その場に留まりたい → **useFetcher**

### 検索を `Form method="get"` にする理由

検索条件を useState で持つと、URL に残らない。
「status=done で絞った状態」をブックマークも共有もリロードもできない。
searchParams に載せれば、URL が状態になり、loader が再実行される。
**React Router を使う意味の大半はここにある。**

## 3.3 楽観的更新（F-06）

チェックボックスを押してから API 応答が返るまでの数百 ms、UI が固まると体感が悪い。

```
1. チェックを押す
2. fetcher が送信中の値を保持している
3. その値を使って UI を「もう完了した」状態で描画する ← 楽観的
4a. 成功 → loader が再検証され、サーバの値で確定
4b. 失敗 → fetcher にエラーが入り、UI が元に戻る
```

送信中の値は fetcher から取得できるので、**自前で「送信中の状態」を
useState で持つ必要がない**。これも状態管理ライブラリが不要な理由のひとつ。

## 3.4 認証ガードの置き場所

| 案 | 内容 | 評価 |
|----|------|------|
| A | 各ルートの loader で毎回チェック | ✗ 新しいルートを足したとき書き忘れる |
| B | **`/app` レイアウトルートの loader でチェック** | ◎ |

**採用：B**

ネストしたルートは親が子より先に必ず実行される。
`/app` の loader が未認証時にリダイレクトすれば、
`/app` 配下は**そもそも描画されないことが構造で保証される**。

> これは API 側の設計判断 2.4（Repository が ownerId を必須で受け取る）と同じ発想。
> 「チェックを書く」のではなく「**通れない構造にする**」。
> 前後半で同じ原則を採っているのは偶然ではなく、設計方針として一貫させている。

## 3.5 状態管理ライブラリを入れない

Redux Toolkit / Zustand / Jotai は**採用しない**。

| 状態の種類 | 例 | どこが持つか |
|-----------|-----|------------|
| サーバ状態 | Todo 一覧、ユーザー情報 | **loader**（React Router がキャッシュ・再検証を担当） |
| URL 状態 | 検索語、フィルタ、ページ番号 | **searchParams** |
| 送信中の状態 | 楽観的更新の途中経過 | **useFetcher** |
| 純粋な UI 状態 | モーダルの開閉、ドロワー | `useState` |

「グローバル状態管理が必要」に見える場面のほとんどはサーバ状態で、
それは React Router のデータ層がすでに持っている。
残るものは useState で足りる。

> 案件でこの判断は必ず突っ込まれる。「Redux は使わないの？」に対して
> **上の表を出せる**ようにしておくのがこの設計の狙い。

## 3.6 ルート定義の形（data mode）

ルートはオブジェクトの配列で定義し、コンポーネントは**名前付きで import** する。

```ts
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  {
    path: '/app',
    element: <AppLayout />,
    loader: requireAuthLoader,          // ← 3.4 の認証ガード
    children: [
      {
        path: 'todos',
        element: <TodosLayout />,       // ← 左ペイン（一覧）
        loader: todosLoader,
        children: [
          { index: true, element: <TodoEmptyState /> },
          { path: 'new', element: <TodoNewPage />, action: createTodoAction },
          {
            path: ':todoId',
            element: <TodoDetailPage />,
            loader: todoDetailLoader,
            action: todoDetailAction,
          },
        ],
      },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
```

`children` のネストが 3.1 の画面構造にそのまま対応している。
`/app` の `loader` が先に走るので、配下は認証済み前提で書ける（3.4）。

## 3.7 実装時に確認が必要な点

- React Router 8 は Node >= 22.22.0 必須（導入済みの v22.23.2 で条件を満たす）
- 本ドキュメントは「どの仕組みが何を担当するか」の設計。正確な import 名・引数の型は実装時に公式ドキュメントで確認する
