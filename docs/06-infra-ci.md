# 06. インフラ・CI 設計

## 6.1 リポジトリ構成

```
ToDoApli/
  pnpm-workspace.yaml
  apps/
    web/                React Router 8（SPA モード）
    api/                NestJS 11
  packages/
    shared/             API レスポンスの型定義のみ
  infra/                Terraform
  docs/                 この設計ドキュメント
  .github/workflows/
  compose.yaml          ローカル PostgreSQL
```

### `packages/shared` に何を置くか

**置く**：`TodoResponseDto` などレスポンスの型定義。
**置かない**：バリデーションロジック。

設計判断 2.3 の通り、サーバ側のバリデーション（不正な入力を拒む）と
クライアント側のバリデーション（ユーザーに親切なエラーを出す）は**目的が違う**。
二重に書くのは冗長ではなく正しい。共有すべきなのは「何が返ってくるか」の型だけ。

## 6.2 Terraform（`infra/`）

```
infra/
  main.tf          terraform / provider ブロック
  variables.tf
  budget.tf        ★ 最初に apply する。コスト監視
  cognito.tf       user pool / app client / domain / branding
  outputs.tf       user_pool_id, client_id, login_domain
  environments/
    dev.tfvars
```

### 最初に apply するのは Cognito ではなく Budget ★

**`budget.tf` を Terraform の 1 本目にする。**（2026-08-22 決定）

無料枠に収まる見込みでも、閾値 **$0.01** で請求アラートを張る。
「無料のはずだから監視しない」ではなく「**無料のはずなのに請求が出たら即座に知る**」
という考え方。$0.01 なら、意図しないリソースが 1 つでも動いた瞬間に鳴る。

これを 1 本目にする理由は監視だけではない:

| 観点 | 内容 |
|------|------|
| コスト | AWS Budgets は 1 アカウントあたり **2 個まで無料**。1 個なら $0 |
| リスク | 課金リソースを一切作らないので、失敗しても何も壊れない |
| 学習 | `init` → `plan` → `apply` → state 確認 → `destroy` の**一周を安全に体験できる** |
| 順序 | 以降に作る Cognito 等の**安全網が先に存在する**状態になる |

```hcl
# infra/budget.tf
resource "aws_budgets_budget" "guardrail" {
  name         = "todoapli-guardrail"
  budget_type  = "COST"
  limit_amount = "0.01"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"          # ← FORECASTED にしない
    subscriber_email_addresses = [var.alert_email]
  }
}
```

**`notification_type` は `ACTUAL` にする。**
`FORECASTED`（予測）だと、$0.01 という極小の閾値に対して
予測値が常に上回るため、鳴りっぱなしになって意味をなさない。

### 注意点

- **反映は即時ではない。** AWS の請求データの更新は 1 日に数回程度なので、
  課金発生からアラートまで数時間〜1 日ほど遅れる。「リアルタイム検知」ではない
- **Budgets の利用には請求情報へのアクセス許可が要る。**
  IAM ユーザーで操作する場合、アカウント設定で
  「IAM ユーザー／ロールによる請求情報へのアクセス」を有効化しておく必要がある
- AWS Budgets は**グローバルサービス**だが、API のエンドポイントは `us-east-1`
- 別枠で **AWS 無料利用枠の使用量アラート**も有効にしておくとよい（Budgets とは別機能で、
  無料枠の消費が一定割合を超えたときに通知される）

### Cognito でコード化する対象（2 本目以降）

| リソース | 主な設定 |
|---------|---------|
| User Pool | tier（Passkey に必要なティア）、必須属性 `email`、WebAuthn 設定 |
| User Pool Client | `callback_urls`、認可コードフロー、**PKCE 必須**、`USER_AUTH` 有効化 |
| User Pool Domain | Managed Login のホスト名 |
| Managed Login Branding | ログイン画面の見た目 |

**アプリクライアントにシークレットを持たせない。**
SPA は公開クライアント（public client）であり、ブラウザに配る JS に
シークレットを埋め込むことはできない。だから PKCE が必須になる。

### outputs の使い道

`user_pool_id` / `client_id` / `login_domain` を出力し、
フロントの環境変数と API の環境変数に流し込む。
**手でコピペしない**（コピペするなら Terraform を使う意味が薄い）。

### state の扱い

- 最初は local backend でよい。慣れたら S3 + DynamoDB ロックへ
- **`*.tfstate` は必ず `.gitignore` に入れる。** state には機微情報が平文で入る
- `terraform.tfvars` も同様

## 6.3 GitHub Actions（`.github/workflows/ci.yml`）

```
on: [push, pull_request]

jobs:
  quality:
    - pnpm / Node 22 のセットアップ（キャッシュ有効）
    - pnpm install --frozen-lockfile
    - pnpm lint          … ESLint
    - pnpm typecheck     … tsc --noEmit
    - pnpm test          … Vitest
    - pnpm build         … web + api
  terraform:
    - terraform fmt -check
    - terraform validate
```

### 設計判断：`typecheck` を `lint` と分ける ★

**ESLint は型を見ない。**
`tsc --noEmit` を独立したステップにしないと、型エラーが CI をすり抜ける。
「lint が通ったから安全」は TypeScript では成り立たない。

### 設計判断：最初は job を分けない

`quality` を 1 job にまとめる。並列化は CI 時間が実際に問題になってから。
早すぎる最適化は、失敗時にどのステップで落ちたか追いにくくなる分だけ損。

### 設計判断：`--frozen-lockfile` を必ず付ける

付けないと、CI がロックファイルを勝手に更新して
「ローカルでは動くが CI では別のバージョンが入る」状態を許してしまう。
CI は**再現性の担保**が仕事なので、ここは譲らない。

### `terraform plan` を CI に入れない（当面）

`plan` は AWS の認証情報を要求する。
長期のアクセスキーを GitHub Secrets に置くのは避けたいので、
**GitHub OIDC + IAM ロール**を設定してから追加する。
それまでは `fmt -check` と `validate` だけにする（認証不要で動く）。

## 6.4 ローカル開発環境

```
compose.yaml   … PostgreSQL 16 のみ
```

アプリ本体は Docker に入れない。ホストで `pnpm dev` を叩く。
理由：ホットリロードの速度と、デバッガの繋ぎやすさ。
Docker 化は「デプロイ時に必要になったら」で間に合う。

`.node-version` に `22` を記載し、fnm が自動で切り替えるようにする
（`/usr/local/bin/node` の v20.17.0 に戻ると React Router 8 が動かないため）。
