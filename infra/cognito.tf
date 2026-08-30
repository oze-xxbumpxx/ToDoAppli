# Cognito（Phase 4 / docs/05-auth.md）。
#
# Phase 5 で Passkey（WebAuthn）を有効化した。Phase 4 との差分は下の 2 か所だけ。

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

  # 第 1 認証要素の選択肢（Phase 5）。
  #
  # ★ PASSWORD を**残している**のが設計判断。Passkey は認証器（この端末）に紐づくので、
  #   端末を失う・登録に失敗する・別の端末から入る、のどれでも詰む。
  #   そもそも最初の 1 個を登録するにも、一度ログインできる手段が要る。
  #   「パスワードレスにする」ことと「パスワードを消す」ことは別物。
  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD", "WEB_AUTHN"]
  }

  # ★ Passkey の設定（2026-08-29 に AWS の API リファレンスで確認）。
  #
  # relying_party_id は「認証器が信頼する相手」を表すドメインで、**WebAuthn の儀式が
  # 実際に動くオリジン**と一致していなければならない。この構成では儀式は
  # Managed Login（Cognito のドメイン）で動くので、アプリ側の localhost:5173 ではない。
  #
  # ★ aws_cognito_user_pool_domain.main.domain を参照していないのは、循環参照になるため。
  #   domain 側が user_pool_id でこのプールを参照しているので、逆向きの参照を足すと
  #   terraform が依存グラフを解けなくなる。同じ値の出どころである var を使う。
  #
  # 注意: 将来 Cognito に**カスタムドメイン**を付けると、RP ID をそのドメインに
  # 変えることが必須になり、**それ以前に登録された Passkey は使えなくなる**（別の RP 扱い）。
  web_authn_configuration {
    relying_party_id = "${var.domain_prefix}.auth.${var.region}.amazoncognito.com"

    # required = ユーザー検証（生体認証・PIN）ができる認証器しか登録・利用できない。
    # Passkey を**第 1 要素**として使う以上、「持っている」だけで通ると弱いので required。
    # preferred にすると、検証なしの古いセキュリティキーでも登録できてしまう。
    user_verification = "required"
  }

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
