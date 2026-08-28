import { Form, NavLink, Outlet, useLoaderData, useSearchParams } from 'react-router';
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

  return (
    <div className={styles.layout}>
      <section>
        {/* GET なので URL が変わる → loader が自動で再実行される（3.2）。
            onSubmit も useState も要らない */}
        <Form method="get">
          <input type="search" name="q" defaultValue={searchParams.get('q') ?? ''} aria-label="検索" />
          <select name="status" defaultValue={searchParams.get('status') ?? ''} aria-label="状態">
            <option value="">すべて</option>
            <option value="todo">未着手</option>
            <option value="doing">進行中</option>
            <option value="done">完了</option>
          </select>
          <button type="submit">絞り込む</button>
        </Form>

        <p>
          {data.total} 件中 {data.items.length} 件
        </p>

        <ul className={styles.list}>
          {data.items.map((todo) => (
            <li key={todo.id}>
              {/* 相対パス。'/app/todos/' を書かないので、ルートを動かしても壊れない */}
              <NavLink to={todo.id} className={todo.status === 'done' ? styles.done : undefined}>
                {todo.title}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* TODO(横展開): ページング。
            page を searchParams に載せれば loader は書き換え不要で動く。
            「次へ」を Link にするか Form にするかは自分で決めること */}
      </section>

      <section>
        <Outlet />
      </section>
    </div>
  );
}
