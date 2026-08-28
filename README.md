# ToDoAppli

Passkey ログイン付き Todo SPA。
2026-09-01 開始の案件で使う技術を、**設計判断を説明できる**状態にするための練習プロジェクト。

設計は [`docs/`](./docs/) にあります。まず [docs/README.md](./docs/README.md) から。

## 構成

```
apps/api/          NestJS 11 + Prisma（Phase 1・完了）
apps/web/          React Router 8（Phase 2・配線と手本のみ。画面はこれから）
packages/shared/   API レスポンスの型。api と web で共有する
reference/         模写用の手本。apps/ には手で打つこと
infra/             Terraform（Phase 4 で作る）
docs/              設計ドキュメント
```

## セットアップ

Node は **22 以上が必須**（React Router 8 の要件）。`.node-version` に固定してあります。

```bash
fnm use          # または nvm use
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up       # PostgreSQL をホストの 5434 番で起動
pnpm --filter @todoapli/api exec prisma migrate dev
pnpm --filter @todoapli/api db:seed
```

> DB のホスト側ポートが **5434** なのは、5432 / 5433 が別プロジェクトで使われているためです。
> 変えるときは `compose.yaml` の `DB_PORT` と `apps/api/.env` の `DATABASE_URL` を合わせてください。

## 開発

```bash
pnpm dev         # API を watch で起動（http://localhost:3000/api/v1）
pnpm lint
pnpm typecheck   # ESLint は型を見ないので別に走らせる（docs/06-infra-ci.md 6.3）
pnpm test
```

## 動作確認

Phase A では認証にダミー JWT を使います（docs/05-auth.md 5.5）。

```bash
pnpm --filter @todoapli/api token user-001 a@test.dev
```

トークンだけが標準出力に出るので、そのまま使えます。

```bash
curl -s http://localhost:3000/api/v1/me -H "Authorization: Bearer $(pnpm -s --filter @todoapli/api token | tail -1)"
```

別ユーザーのトークンも発行すれば、**他人の Todo が見えないこと**を手で確認できます。

## いまここ

- **Phase 0** 設計 … 完了（決定 D-1〜D-10）
- **Phase 1** API 骨格 … **完了**。6 エンドポイントすべて実装済み、単体テスト 43 本
  → レビュー観点は [apps/api/src/todos/README.md](./apps/api/src/todos/README.md)
- **Phase 3** CI … 完了。lint / typecheck / test / build が PR で回る
- **Phase 2** フロント … **ここが次**。配線と手本は用意済み、画面はこれから
  → [apps/web/README.md](./apps/web/README.md) を読んでください
- Phase 4 Cognito + Terraform / Phase 5 Passkey … 未着手

Phase 3 が Phase 2 より先に終わっているのは、CI が他フェーズに依存しないため
先に片付けたからで、計画（[docs/07-plan.md](./docs/07-plan.md) 7.1）からの逸脱ではありません。
