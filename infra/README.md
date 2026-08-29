# infra — Terraform

## いまの状態（2026-08-28）

| | 中身 |
|---|---|
| `main.tf` | provider 2 本（既定 `ap-northeast-1` と Budgets 用 `us-east-1`）、state はローカル |
| `variables.tf` | `alert_email` だけ**既定値を置いていない**（未指定なら止まる） |
| `budget.tf` | **1 本目**。閾値 $0.01・`ACTUAL` の請求アラート（決定 D-10） |
| `outputs.tf` | いまは Budget のみ。Cognito を作ったら `user_pool_id` 等を足す |
| `environments/dev.tfvars.example` | コピーして `dev.tfvars` を作る。`*.tfvars` は git 管理外 |

`cognito.tf` は**まだありません**。Budget を apply して一周を確認してから足します。

## 実行手順

```bash
cp environments/dev.tfvars.example environments/dev.tfvars
```

`dev.tfvars` の `alert_email` を自分のアドレスに書き換えてから:

```bash
terraform plan -var-file=environments/dev.tfvars
```

```bash
terraform apply -var-file=environments/dev.tfvars
```

作られるのは Budget 1 個だけです（AWS Budgets は 1 アカウント 2 個まで無料）。
`destroy` して作り直しても課金は発生しません。

## レビューで見るところ

- [ ] なぜ **Cognito ではなく Budget が 1 本目**なのか説明できるか（docs/06 の 6.2）
- [ ] `notification_type` が `FORECASTED` ではなく **`ACTUAL`** なのはなぜか
- [ ] provider の alias が 1 本余分にあるのはなぜか（`region` を変えれば済む話ではない）
- [ ] `alert_email` に既定値が無いのはなぜか
- [ ] `*.tfstate` と `*.tfvars` が `.gitignore` に入っているか（state には機微情報が平文で入る）

## 注意（実運用の前提）

- **アラートは即時ではない。** AWS の請求データ更新は 1 日に数回なので、課金発生から
  メールまで数時間〜1 日ずれる。「発生を防ぐ」網ではなく「気づいて止める」網
- **state はローカル。** いまは 1 人・1 台なので十分だが、CI から apply する段になったら
  S3 + ロックへ移す必要がある
- `.terraform.lock.hcl` は**コミットする**。provider のバージョンを機械間で固定するファイルで、
  無視すると「自分の環境では通るのに CI で別バージョンが落ちてくる」が起きる
