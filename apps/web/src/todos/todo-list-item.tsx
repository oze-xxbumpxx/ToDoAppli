import type { TodoResponse } from '@todoapli/shared';
import { NavLink, useFetcher } from 'react-router';
import { isTodoStatus, TODO_STATUS_LABELS } from './todo-status';
import styles from './todos-layout.module.css';

interface TodoListItemProps {
  readonly todo: TodoResponse;
}

/**
 * 一覧の 1 行。**この 1 ファイルが F-06（完了トグル）の答え**（docs/03-frontend.md 3.2 / 3.3）。
 *
 * ★ なぜ Form ではなく useFetcher か:
 *   押した結果ここに**留まりたい**から。Form だと送信がナビゲーションになり、
 *   履歴に積まれ、スクロール位置もリセットされる。「送信した結果、別の画面に行くか？」
 *   が判断基準で、ここは No。
 *
 * ★ なぜ行ごとにコンポーネントを分けたか:
 *   useFetcher は hooks なので map の中では呼べない。1 行 = 1 fetcher にすると、
 *   3 行を続けて押しても互いの送信を潰し合わない（fetcher を共有すると後勝ちになる）。
 */
export function TodoListItem({ todo }: TodoListItemProps): React.JSX.Element {
  const fetcher = useFetcher();

  // ★ 楽観的更新（3.3）。送信中の値は fetcher が持っているので、
  //   「送信中の状態」を useState で持つ必要がない。
  //   成功すれば loader が再検証されてサーバの値で確定し、失敗すれば
  //   formData が消えて自動で元に戻る。ロールバック処理を書いていないのはそのため
  const submitting = fetcher.formData?.get('status');
  const status = isTodoStatus(submitting) ? submitting : todo.status;
  const done = status === 'done';

  return (
    <li className={styles.item}>
      {/* action を明示して、詳細ルート（:todoId）の action を呼ぶ。
          この行は一覧ルートの中にあるので、書かないと一覧ルートに送信されてしまう */}
      <fetcher.Form method="patch" action={`/app/todos/${todo.id}`}>
        {/* ★ done → doing は Entity が拒む（422 invalid-status-transition）。
            戻すときは todo にする。ドメインの規則が UI の選択肢を決めている */}
        <input type="hidden" name="status" value={done ? 'todo' : 'done'} />
        <button type="submit" aria-label={`${todo.title} を${done ? '未完了に戻す' : '完了にする'}`}>
          {done ? '☑' : '☐'}
        </button>
      </fetcher.Form>

      {/* 相対パス。'/app/todos/' を書かないので、ルートを動かしても壊れない */}
      <NavLink to={todo.id} className={done ? styles.done : undefined}>
        {todo.title}
      </NavLink>
      <small>{TODO_STATUS_LABELS[status]}</small>
    </li>
  );
}
