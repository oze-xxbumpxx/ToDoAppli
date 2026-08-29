variable "project" {
  description = "リソース名のプレフィックスとタグに使う"
  type        = string
  default     = "todoapli"
}

variable "environment" {
  description = "環境名。タグにのみ使う"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "Cognito などを作るリージョン。Budgets はここではなく us-east-1 に作られる"
  type        = string
  default     = "ap-northeast-1"
}

# ★ 既定値を置かない。ここに他人のアドレスが入ったまま apply される事故を防ぐため、
#   値を渡さなければ terraform が止まるようにしてある。
variable "alert_email" {
  description = "請求アラートの通知先。environments/dev.tfvars に書く（git には入らない）"
  type        = string

  validation {
    condition     = can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alert_email))
    error_message = "alert_email はメールアドレスの形式で指定してください。"
  }
}

variable "budget_limit_usd" {
  description = "月額の閾値（USD）。決定 D-10 により 0.01"
  type        = string
  default     = "0.01"
}

# ---- Cognito（Phase 4）----

variable "domain_prefix" {
  description = "Managed Login のホスト名。<prefix>.auth.<region>.amazoncognito.com になる。AWS 全体で一意"
  type        = string
  default     = "todoapli-dev"
}

variable "callback_urls" {
  description = "認可コードのリダイレクト先。**文字列の完全一致**で照合される（末尾スラッシュ 1 つでも違うと拒否）"
  type        = list(string)
  default     = ["http://localhost:5173/auth/callback"]
}

variable "logout_urls" {
  description = "ログアウト後の戻り先。こちらも完全一致"
  type        = list(string)
  default     = ["http://localhost:5173/login"]
}
