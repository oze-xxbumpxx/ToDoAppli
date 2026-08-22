# 01. 要件定義

## 1.1 このアプリの目的

**Passkey ログイン付き Todo SPA**。
9/1 開始案件で使う技術（React Router / NestJS / Cognito / Terraform / GitHub Actions）を、
「一通り触った」ではなく「設計判断を説明できる」状態にすることが目的。

したがって機能は意図的に小さく保つ。技術の練習量を稼ぐために機能を増やさない。

## 1.2 機能要件

| ID | 要件 | 主に練習する技術 |
|----|------|----------------|
| F-01 | Passkey で新規登録できる | Cognito WebAuthn / Terraform |
| F-02 | Passkey でログイン・ログアウトできる | Cognito Managed Login / JWT |
| F-03 | 自分の Todo を一覧できる（status フィルタ・キーワード検索） | RR `loader` / Nested Routes |
| F-04 | Todo を新規作成できる | RR `Form` + `action` / DTO / UseCase |
| F-05 | Todo の詳細を見て編集できる | RR ネストした `loader` / `action` |
| F-06 | 完了状態をチェックボックスで即時トグルできる | RR `useFetcher` + 楽観的更新 |
| F-07 | Todo を削除できる | RR `Form method="delete"` |
| F-08 | 他人の Todo には一切アクセスできない | 認可設計 / Repository 層 |
| F-09 | 未完了の Todo に同じタイトルを 2 つ作れない | **Domain Service**（→ 決定 D-8） |

> **F-09 は 2026-08-22 に追加**。他の要件はすべて Entity と値オブジェクトに収まってしまい、
> Domain Service を書く必然性が生まれなかったため、練習対象として意図的に足した業務ルール。
> 「他の Todo を見ないと判定できない」ので Entity には置けない（→ [04 の 4.8](./04-backend.md)）。

**やらないこと**（スコープ外を明示するのも設計）
- Todo の共有・コラボレーション
- タグ、サブタスク、繰り返し、通知
- パスワードログイン（Passkey 一本。フォールバックを作ると Cognito 設定が倍に膨らむ）
- SSR / SSG（SPA と明示されているため `ssr: false`）

## 1.3 非機能要件

| 項目 | 決定 | 理由 |
|------|------|------|
| 描画方式 | SPA（React Router framework mode, `ssr: false`） | 案件が SPA 前提 |
| 認証方式 | Cognito 発行の JWT を `Authorization: Bearer` で送信 | 標準的で説明しやすい |
| API 形式 | REST / JSON | 案件が REST 前提 |
| 対応ブラウザ | Passkey 対応の最新 Chrome / Safari | WebAuthn 必須のため割り切る |
| テスト | UseCase 層の単体テスト（Vitest）を必須、E2E は任意 | 費用対効果が最も高い層 |
| CI | push / PR で lint・test・build | 案件要件 |

## 1.4 前提条件と制約（2026-08-21 時点で確認済み）

| 項目 | 状況 | 対応 |
|------|------|------|
| Node | v20.17.0 だった → **fnm で v22.23.2 を導入済み** | React Router 8 は Node >= 22.22.0 必須のため必要だった |
| pnpm | 10.33.4 導入済み | そのまま使う |
| Docker | 28.5.1 導入済み | ローカル PostgreSQL に使う |
| gh CLI | 2.95.0 導入済み | GitHub Actions の確認に使う |
| Terraform | **未インストール** | Phase 3 開始前に `brew install terraform` |
| AWS CLI | **未インストール** | Phase 3 開始前に `brew install awscli` |
| AWS アカウント | **未設定** | アカウント作成と `aws configure` は本人作業 |

### コスト（2026-08-22 に AWS 公式料金ページで確認）

> **訂正**：初版で「Passkey は無料枠では使えず課金が発生する」と書いたのは**誤り**。
> Essentials にも 10,000 MAU/月の無料枠がある。

| ティア | 無料枠（直接／ソーシャル） | 超過分 | Passkey |
|--------|--------------------------|--------|---------|
| Lite | 10,000 MAU/月 | $0.0055 /MAU | ✗ |
| **Essentials**（新規プールの既定） | **10,000 MAU/月** | $0.015 /MAU | **✓** |
| Plus | なし | $0.020 /MAU | ✓ |

- 無料枠は 12 ヶ月の AWS 無料利用枠とは別で、**無期限**。既存・新規どちらの AWS アカウントでも適用される
- MAU＝その月に認証操作をしたユーザー数。テストユーザー 1〜2 人なら **1〜2 MAU → $0**
- Cognito のプレフィックスドメイン（`xxx.auth.<region>.amazoncognito.com`）も無料
- この設計には RDS も NAT Gateway も登場しないため、隠れコストなし

**結論：この規模なら Passkey まで含めて実質 $0。**

ただし「無料のはずだから監視しない」ではなく、
**「無料のはずなのに請求が出たら即座に知る」**ために、
AWS Budgets で **閾値 $0.01** のアラートを張る。
これを Terraform の 1 本目として書く（→ [06 の 6.2](./06-infra-ci.md)）。

出典: <https://aws.amazon.com/cognito/pricing/>
