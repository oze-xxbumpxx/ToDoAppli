terraform {
  # 1.9 以降を要求する。variable の validation で他の変数を参照できるようになった版
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # state は当面ローカル（docs/06-infra-ci.md 6.2）。
  # S3 + ロックに移すのは、複数人・複数マシンで触るようになってから。
  # 先に移しても管理対象が増えるだけで、いま得られる安全性は無い。
}

locals {
  # 全リソース共通のタグ。「誰が何のために作ったか」が請求画面から辿れる状態にしておく
  tags = {
    Project   = var.project
    ManagedBy = "terraform"
    Env       = var.environment
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.tags
  }
}

# ★ Budgets はグローバルサービスだが、API エンドポイントが us-east-1 固定
#   （docs/06-infra-ci.md 6.2）。既定リージョン（ap-northeast-1）のままだと
#   apply が通らないので、この 1 本のために alias を切る。
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.tags
  }
}
