# reference — 模写用の手本

ここにあるコードは **読んで、手で打ち写すためのもの**です。
ビルドにも lint にも含まれません（相対 import が `apps/api/src/todos/` に
置かれて初めて解決するため）。

## 使い方

1. `reference/phase1-list-todos/` を**別ウィンドウで開く**
2. 同じパス構成で `apps/api/src/todos/` に**手で打つ**
3. 打ち終わったら手本を**閉じて**、横展開に入る

**コピーしないでください。** `cp -R` で済ませると、
このディレクトリを置いた意味がなくなります（docs/08-learning-method.md 8.1）。

## なぜ「一覧取得」が手本なのか

- Controller → UseCase → Repository → Prisma の**全層を通る**
- 認可（`ownerId` の受け渡し）も通る
- **副作用がない**ので、失敗しても何も壊れない

一覧を写せば、作成・取得・更新・削除は「同じ形」で書けます。
書けなければ、模写が理解になっていないという判定がその場で出ます。

## 手本に含めていないもの

意図的に空けてあります。ここが学習対象です。

| 箇所 | 空けた理由 |
|------|-----------|
| `Todo.create()` / `rename()` | `changeStatus()` と同じ形。パターンは一度見れば足りる |
| `TodoRepository` の findById 以下 | 横展開で自分で足す。いずれも `ownerId` が第一引数 |
| Domain Service（F-09） | Create と Update の両方から呼ばれる構造を自分で組む |
| テストケース | 仕掛け（InMemoryTodoRepository）だけ手本。**ケース設計は自分で** |

## 検証済みであること

この手本は 2026-08-22 に `apps/api/src/todos/` へ実際に展開して、
`typecheck` / `lint` / `test` / 起動して `curl` まで通ることを確認してあります。
写して動かない場合は、写し間違いを先に疑ってください。
