import { Form, useFetcher, useLoaderData } from 'react-router';
import type { todoDetailLoader } from './todo-detail.loader';
import { TODO_STATUSES, TODO_STATUS_LABELS } from './todo-status';
import type { todoDetailAction } from './todo.actions';
import styles from './todos-layout.module.css';

/**
 * 詳細・編集・削除（F-05 / F-06 / F-07）。右ペインに出る。
 *
 * ★ このファイルには **Form と useFetcher が 1 つずつ**ある。同じ action を呼ぶのに
 *   使い分けているのが Phase 2 の核心（docs/03-frontend.md 3.2）。
 *
 *   - 編集 → **useFetcher**。保存してもこの画面に留まる。履歴も汚したくない
 *   - 削除 → **Form**。消したらこの画面は存在できないので、一覧へ**遷移する**
 *
 *   判断基準は 1 つだけ：「送信した結果、別の画面に行くか？」
 */
export function TodoDetailPage(): React.JSX.Element {
  const todo = useLoaderData<typeof todoDetailLoader>();
  const fetcher = useFetcher<typeof todoDetailAction>();

  // action は成功時に TodoResponse、入力エラー時に TodoFormError を返す。
  // 型が違うので message の有無で判別する（判別用のフラグを足すより素直）
  const error =
    fetcher.data !== undefined && 'message' in fetcher.data ? fetcher.data : undefined;
  const saving = fetcher.state === 'submitting';

  return (
    <section>
      <h2>{todo.title}</h2>

      {error === undefined ? null : (
        <p role="alert" className={styles.error}>
          {error.message}
        </p>
      )}

      {/* ★ key を付けているのは、別の Todo に切り替わったときに
          defaultValue を読み直させるため。key が無いと React は同じ input を使い回し、
          前の Todo の入力内容が残ったままになる（loader だけ入れ替わって画面が嘘をつく） */}
      <fetcher.Form method="patch" key={todo.id} className={styles.form}>
        <label>
          タイトル
          <input type="text" name="title" defaultValue={todo.title} required maxLength={120} />
        </label>
        <label>
          説明
          <textarea name="description" rows={4} maxLength={2000} defaultValue={todo.description ?? ''} />
        </label>
        <label>
          期限
          {/* input[type=date] は 'YYYY-MM-DD' しか受け取らない。
              ISO 文字列の先頭 10 文字は UTC 日付なので、日本時間の深夜だと 1 日ずれる。
              Phase 2 では割り切っている（Intl での整形は Phase 4 以降の課題） */}
          <input type="date" name="dueDate" defaultValue={todo.dueDate?.slice(0, 10) ?? ''} />
        </label>
        <label>
          状態
          <select name="status" defaultValue={todo.status}>
            {TODO_STATUSES.map((status) => (
              // done → doing は API が 422 を返す。選べてしまうのは意図的で、
              // 「UI で隠す」のではなく「サーバが拒む」を確認できるようにしてある
              <option key={status} value={status}>
                {TODO_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存する'}
        </button>
      </fetcher.Form>

      {/* 削除だけ Form。送信後に action が redirect を返し、一覧へ遷移する。
          ★ 確認ダイアログは onSubmit で止める。action まで行ってしまうと取り消せない */}
      <Form
        method="delete"
        onSubmit={(event) => {
          if (!window.confirm(`「${todo.title}」を削除します。よろしいですか？`)) {
            event.preventDefault();
          }
        }}
      >
        <button type="submit">削除する</button>
      </Form>

      <dl className={styles.meta}>
        <dt>作成</dt>
        <dd>{todo.createdAt}</dd>
        <dt>更新</dt>
        <dd>{todo.updatedAt}</dd>
      </dl>
    </section>
  );
}
