# 設計ドキュメント

**Passkey ログイン付き Todo SPA** — 2026-09-01 開始案件の技術習得用プロジェクト。

| # | ドキュメント | 内容 |
|---|-------------|------|
| 01 | [要件定義](./01-requirements.md) | 機能要件・非機能要件・スコープ外・前提条件 |
| 02 | [ドメインと API](./02-domain-and-api.md) | ドメインモデル / エンドポイント / DTO / **認可の実装場所** |
| 03 | [フロントエンド](./03-frontend.md) | ルート構成 / **loader・action・Form・useFetcher の使い分け** |
| 04 | [バックエンド](./04-backend.md) | NestJS の層構成 / 依存性逆転 / DI / テスト戦略 / **ドメインロジックの置き場所** |
| 05 | [認証](./05-auth.md) | Cognito + Passkey のフロー / JWT 検証 / **Phase 分割** |
| 06 | [インフラ・CI](./06-infra-ci.md) | Terraform / GitHub Actions / ローカル環境 |
| 07 | [計画と決定ログ](./07-plan.md) | フェーズ計画 / **★決定ログ D-1〜D-9** / 想定問答 |
| 08 | [学習方法](./08-learning-method.md) | **模写の切り分け** / 縦 1 本 → 横展開 / レビュー観点 |
| 09 | [コーディング規約](./09-coding-standards.md) | **Google TypeScript Style Guide** / フレームワーク慣習との衝突 2 件 |
| 10 | [LLM レシピ提案](./10-llm-recipe.md) | Amazon Bedrock / **費用の見積もりと上限の置き方** / ポートとアダプタへの載せ方 |

## 技術スタック

| 層 | 技術 |
|----|------|
| フロント | React + React Router 8（**data mode** / `createBrowserRouter`） |
| バックエンド | NestJS 11 |
| 認証 | AWS Cognito（Passkey / WebAuthn） |
| DB | PostgreSQL 16 + **Prisma** |
| インフラ | Terraform |
| CI | GitHub Actions |

## 次にやること

**Phase 0（設計）完了 — 2026-08-22。** D-1〜D-10 すべて決定済み。

→ **Phase 1**：monorepo 骨格 / NestJS 層構成 / PostgreSQL / ダミー JWT
（[07-plan.md](./07-plan.md) の 7.1、[08-learning-method.md](./08-learning-method.md) の 8.4）
