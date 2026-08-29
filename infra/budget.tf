# ★ Terraform の 1 本目（決定 D-10 / docs/06-infra-ci.md 6.2）。
#
# Cognito より先にこれを作る理由は 4 つ:
#   コスト — AWS Budgets は 1 アカウント 2 個まで無料。1 個なら $0
#   リスク — 課金リソースを一切作らないので、失敗しても何も壊れない
#   学習   — init → plan → apply → state 確認 → destroy の一周を安全に体験できる
#   順序   — 以降に作る Cognito の「安全網が先に存在する」状態になる
#
# 「無料のはずだから監視しない」ではなく「無料のはずなのに請求が出たら即座に知る」。
resource "aws_budgets_budget" "guardrail" {
  provider = aws.us_east_1

  name         = "${var.project}-guardrail"
  budget_type  = "COST"
  limit_amount = var.budget_limit_usd
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 100
    threshold_type      = "PERCENTAGE"

    # ★ FORECASTED にしない。$0.01 という極小の閾値に対して予測値は常に上回るので、
    #   鳴りっぱなしになって「鳴っても見ない」状態を作ってしまう。
    #   見たいのは「実際に課金が出た」瞬間なので ACTUAL。
    notification_type = "ACTUAL"

    subscriber_email_addresses = [var.alert_email]
  }
}
