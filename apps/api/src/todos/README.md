# todos

## いまの状態（2026-08-27）

| | 誰が書いたか |
|---|---|
| 一覧取得の縦 1 本（手本 `reference/phase1-list-todos/`） | **あなた**（模写済み・動作確認済み） |
| domain の spec 3 本（entity / title / status） | **あなた**（手本に無いものを自力で追加） |
| 横展開 4 本（POST / GET :id / PATCH / DELETE）と Domain Service | **Claude**（2026-08-27 に方針変更。あなたはレビュー側） |

> 当初は横展開も本人が書く計画でした（docs/08-learning-method.md 8.3）。
> 9/1 の日程が押したため、**「Claude が書き、本人が読んでレビューする」に変更**。
> 理解度の確認は、書けるかどうかではなく**レビューで指摘できるか**で取ります。

## レビューで見るところ（docs/08-learning-method.md 8.5）

「動くか」ではなく「**設計通りか**」を見てください。

- [ ] `ownerId` が Repository の第一引数に渡っているか（[02 の 2.4](../../../../docs/02-domain-and-api.md)）
- [ ] Controller に業務ロジックが漏れていないか（[04 の 4.2](../../../../docs/04-backend.md)）
- [ ] UseCase が Prisma を import していないか（[04 の 4.3](../../../../docs/04-backend.md)）
- [ ] domain 層が NestJS を import していないか（同上。ESLint も見ている）
- [ ] 業務ルールが Entity / 値オブジェクト / Domain Service のどれに置かれているか、
      その振り分けが [04 の 4.8](../../../../docs/04-backend.md) の基準どおりか

### 特に説明できるようにしておくもの

| 場所 | 問い |
|---|---|
| `presentation/todos.controller.ts` の `update()` | なぜ `body.description` に `?? null` を付けてはいけないのか |
| `application/update-todo.usecase.ts` の末尾 | なぜ「タイトルを変えたとき」ではなく「変更後が未完了なら」F-09 を見るのか |
| `application/delete-todo.usecase.ts` | なぜクエリを 2 本にしてまで `findById` してから消すのか |
| `infrastructure/prisma-todo.repository.ts` の `findById` | なぜ `findUnique({ id })` ではないのか |
| `todos.module.ts` の `useFactory` | なぜ Domain Service に `@Injectable()` を付けられないのか |

## 動作確認済みのこと（2026-08-27、実際に HTTP で確認）

| 確認 | 結果 |
|---|---|
| `POST /todos` | 201 + `Location: /api/v1/todos/{id}` |
| 同じタイトルで再度 POST | 422 `duplicate-todo-title`（F-09） |
| `GET /todos/:id` 自分 / 他人 / 不正 UUID | 200 / **404** / 400 |
| `PATCH` で status だけ送る | description は変わらない |
| `PATCH` で `description: null` | 消える |
| `PATCH` で done → doing | 422 `invalid-status-transition` |
| `PATCH` に DTO に無いキー | 400（`whitelist` + `forbidNonWhitelisted`） |
| `DELETE` 1 回目 / 2 回目 / 他人 | 204 / 404 / 404 |

## まだ無いもの（意図的）

- **DB レベルの一意制約**。F-09 は Domain Service だけで守っており、
  同時リクエストでは 2 本ともすり抜ける。本来の最後の砦は
  `WHERE status IN ('todo','doing')` の部分ユニークインデックスで、
  Prisma のスキーマでは表現できず migration に生 SQL が要る。
  **入れていない**が、案件で聞かれたら答えられるようにしておくこと
- Controller レベルのテスト（`@nestjs/testing` + supertest）。
  単体テストは 43 本あるが、DI の配線ミスは検出できない
