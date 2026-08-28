import { Form, Link, Outlet, useLoaderData, useSearchParams } from 'react-router';
import { TodoListItem } from './todo-list-item';
import { TODO_STATUSES, TODO_STATUS_LABELS } from './todo-status';
import styles from './todos-layout.module.css';
import type { todosLoader } from './todos.loader';

/**
 * 左ペイン＝一覧、右ペイン＝<Outlet />（docs/03-frontend.md 3.1）。
 *
 * ★ ここが Nested Routes の実利が出る場所。
 *   /app/todos/1 → /app/todos/2 と遷移しても、**このルートの loader は再実行されない**。
 *   左の一覧はそのまま、右だけ差し替わる。
 *   フラットなルート構成にすると、詳細に移るたびに一覧を取り直すか、
 *   一覧をグローバル state に退避することになる。**ルート構造で解決している。**
 */
export function TodosLayout(): React.JSX.Element {
  // 型引数に loader の型を渡すと、items の中身まで型が付く
  const data = useLoaderData<typeof todosLoader>();
  const [searchParams] = useSearchParams();

  const lastPage = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div className={styles.layout}>
      <section>
        {/* GET なので URL が変わる → loader が自動で再実行される（3.2）。
            onSubmit も useState も要らない。
            ★ page を hidden で持ち回していないのは意図的。絞り込み直したら
              1 ページ目に戻ってほしく、page がキーごと消えれば API 側の既定（1）に戻る */}
        <Form method="get" className={styles.filter}>
          <input
            type="search"
            name="q"
            defaultValue={searchParams.get('q') ?? ''}
            aria-label="検索"
          />
          <select
            name="status"
            defaultValue={searchParams.get('status') ?? ''}
            aria-label="状態"
          >
            <option value="">すべて</option>
            {TODO_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TODO_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <button type="submit">絞り込む</button>
        </Form>

        <p className={styles.summary}>
          {data.total} 件中 {data.items.length} 件（{data.page} / {lastPage} ページ）
          <Link to={{ pathname: '/app/todos/new', search: searchParams.toString() }}>
            新規作成
          </Link>
        </p>

        <ul className={styles.list}>
          {data.items.map((todo) => (
            <TodoListItem key={todo.id} todo={todo} />
          ))}
        </ul>

        {/* ページングは Link で十分。押した結果 URL が変われば loader が再実行されるので、
            送信も状態管理も要らない。**loader は 1 行も変えていない**（page は素通し）。
            ★ pathname を明示しているのは、詳細を開いたまま押したときに
              `/app/todos/:id?page=2` になって一覧と詳細がちぐはぐになるのを避けるため */}
        <nav className={styles.pager}>
          {data.page > 1 ? (
            <Link to={{ pathname: '/app/todos', search: pageSearch(searchParams, data.page - 1) }}>
              前へ
            </Link>
          ) : null}
          {data.page < lastPage ? (
            <Link to={{ pathname: '/app/todos', search: pageSearch(searchParams, data.page + 1) }}>
              次へ
            </Link>
          ) : null}
        </nav>
      </section>

      <section>
        <Outlet />
      </section>
    </div>
  );
}

/** 現在の絞り込みを保ったまま page だけ差し替える。条件が消えると「絞ったのに戻る」になる。 */
function pageSearch(current: URLSearchParams, page: number): string {
  const next = new URLSearchParams(current);
  next.set('page', String(page));
  return next.toString();
}
