# Cognito（Phase 4 / docs/05-auth.md）。
#
# ★ ここで作るのは「パスワードでログインできる状態」までです。
#   Passkey（WebAuthn）の有効化は Phase 5 で、下の web_authn_configuration の
#   コメントを外して sign_in_policy に WEB_AUTHN を足すだけになります。
#   一度に両方入れないのは、失敗したときに「Cognito の設定ミス」か
#   「WebAuthn の要件不足」かを切り分けられなくなるため（docs/05 の 5.5 の Phase B / C）。

resource "aws_cognito_user_pool" "main" {
  name = "${var.project}-${var.environment}"

  # ★ Passkey には Essentials 以上が必要（Lite では有効化できない）。
  #   Essentials にも 10,000 MAU/月の無料枠があり、テスト 1〜2 人なら $0（docs/01 の 1.4）。
  #   Phase 5 でティアを上げ直さずに済むよう、最初から Essentials で作る。
  user_pool_tier = "ESSENTIALS"

  # ユーザー名を使わず、メールアドレスでログインする。
  # username_attributes を後から変えることはできない（プールの作り直しになる）。
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # ★ dev では明示的に無効化する。有効なままだと terraform destroy が失敗し、
  #   「作って壊す」練習ができない。本番では ACTIVE にすること。
  deletion_protection = "INACTIVE"

  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  # 第 1 認証要素の選択肢。Phase 5 で "WEB_AUTHN" を足す。
  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD"]
  }

  # TODO(Phase 5): Passkey を有効化する。
  #   relying_party_id は **WebAuthn の儀式が動くドメイン**に一致している必要がある。
  #   Managed Login に任せる構成なので Cognito 側のドメインになるが、
  #   属性名・許容値ともに着手時に AWS の公式ドキュメントで確認すること（docs/05 の 5.6）。
  #
  # web_authn_configuration {
  #   relying_party_id = "${var.domain_prefix}.auth.${var.region}.amazoncognito.com"
  #   user_verification = "required"
  # }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # 送信元は Cognito の既定（1 日 50 通まで）。本番は SES に切り替える。
  # 検証コードのメールが届かないときは、まずここの上限を疑う。
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project}-web"
  user_pool_id = aws_cognito_user_pool.main.id

  # ★★ SPA は公開クライアント。シークレットを持たせない。
  #    ブラウザに配る JS に埋め込んだ時点で読めるので、秘密になり得ない。
  #    シークレットが無い代わりに PKCE が必須になる（Cognito 側が強制する）。
  generate_secret = false

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"] # 暗黙フロー（token）は使わない
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = ["COGNITO"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  # USER_AUTH は選択式認証（Passkey を含む）のフロー。Phase 5 で効いてくる。
  # SRP を入れていないのは、Managed Login 経由でしかログインしないため。
  explicit_auth_flows = ["ALLOW_USER_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]

  # ★ 「ユーザーが存在しない」と「パスワードが違う」を区別させない。
  #   区別できると、メールアドレスの総当たりで登録済みかどうかを判定されてしまう。
  #   API 側で他人の Todo を 404 にしているのと同じ原則（docs/02 の 2.4）。
  prevent_user_existence_errors = "ENABLED"

  enable_token_revocation = true

  access_token_validity  = 60 # 分
  id_token_validity      = 60 # 分
  refresh_token_validity = 30 # 日

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id

  # ★ 2 = 新しい Managed Login。1（旧 Hosted UI）では WebAuthn が使えない（docs/05 の 5.6）。
  managed_login_version = 2
}

# 見た目は Cognito の既定に任せる。ブランディングを自前で書くと JSON が数百行になり、
# Phase 5 の本題（Passkey が動くか）から注意が逸れる。
resource "aws_cognito_managed_login_branding" "web" {
  user_pool_id                = aws_cognito_user_pool.main.id
  client_id                   = aws_cognito_user_pool_client.web.id
  use_cognito_provided_values = true
}
