output "budget_name" {
  description = "作成した Budget の名前。コンソールで探すときに使う"
  value       = aws_budgets_budget.guardrail.name
}

output "budget_arn" {
  description = "Budget の ARN"
  value       = aws_budgets_budget.guardrail.arn
}

# Cognito を作ったら user_pool_id / client_id / login_domain をここに足す。
# フロントと API の環境変数はこの出力から流し込む（手でコピペしない。docs/06 6.2）。

# ---- Cognito（Phase 4）----
# ★ これらを手でコピペしない。フロントと API の環境変数はここから流し込む（docs/06 の 6.2）。

output "user_pool_id" {
  description = "API の iss 検証とユーザー作成に使う"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  description = "フロントの認可リクエストと、API の client_id 検証に使う"
  value       = aws_cognito_user_pool_client.web.id
}

output "login_domain" {
  description = "Managed Login のホスト名"
  value       = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.region}.amazoncognito.com"
}

output "issuer_url" {
  description = "API が検証する iss。JWKS は この URL + /.well-known/jwks.json"
  value       = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}
