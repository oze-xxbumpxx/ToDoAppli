import { Form, useActionData, useNavigation } from 'react-router';
import type { createTodoAction } from './todo.actions';
import styles from './todos-layout.module.css';

/**
 * 新規作成（F-04）。右ペインに出る（docs/03-frontend.md 3.1）。
 *
 * ★ Form を選んだ理由は todo.actions.ts の createTodoAction に書いた（作成後に遷移するから）。
 *
 * ★ このファイルに fetch も useState も無いことを確認してほしい。
 *   入力値はブラウザの form が持ち、送信は Form が、通信は action が、
 *   結果の受け渡しは useActionData がやる。React に持たせる状態が 1 つも残らない。
 */
export function TodoNewPage(): React.JSX.Element {
  // 400 / 422 のときだけ値が入る。redirect した場合はここには来ない（画面が変わるので）
  const error = useActionData<typeof createTodoAction>();
  const navigation = useNavigation();
  const submitting = navigation.state === 'submitting';

  return (
    <section>
      <h2>新しい Todo</h2>

      {/* ★ 422 は「F-09: 未完了に同じタイトルがある」。入力そのものは正しいので、
          画面を差し替えず**入力を残したまま**メッセージだけ出す（2.5 の出し分け） */}
      {error === undefined ? null : (
        <p role="alert" className={styles.error}>
          {error.message}
        </p>
      )}

      <Form method="post" className={styles.form}>
        <label>
          タイトル
          {/* required は「サーバを守るため」ではなく、往復を減らすため。
              本当の検証は API 側の DTO（400）とドメイン（422） */}
          <input type="text" name="title" required maxLength={120} />
        </label>
        <label>
          説明
          <textarea name="description" rows={4} maxLength={2000} />
        </label>
        <label>
          期限
          <input type="date" name="dueDate" />
        </label>
        {/* status を置いていないのは、新規作成が必ず 'todo' で始まるから。
            API 側の CreateTodoDto にもそもそも status が無い（作れないのが正しい） */}
        <button type="submit" disabled={submitting}>
          {submitting ? '作成中…' : '作成する'}
        </button>
      </Form>
    </section>
  );
}
