import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './app/app-layout';
import { LoginPage } from './auth/login-page';
import { requireAuthLoader } from './auth/require-auth.loader';
import { TodoEmptyState } from './todos/todo-empty-state';
import { TodosLayout } from './todos/todos-layout';
import { todosLoader } from './todos/todos.loader';

/**
 * ルート定義（docs/03-frontend.md 3.1 / 3.6）。
 *
 * コンポーネントは**名前付き import**（G-1: default export 禁止）。
 * framework mode を採らなかった理由のひとつがこれ（D-3）。
 *
 * ネストは画面の入れ子と 1 対 1 に対応している:
 *   /app          … ヘッダとナビ。ここで認証ガード（3.4）
 *     /app/todos  … 左ペインの一覧。右ペインが <Outlet />
 */
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app/todos" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/app',
    element: <AppLayout />,
    // ★ 親が先に走るので、配下は認証済み前提で書ける（3.4）。
    //   各ルートに書かないので「新しいルートで書き忘れる」事故が起きない
    loader: requireAuthLoader,
    children: [
      { index: true, element: <Navigate to="/app/todos" replace /> },
      {
        path: 'todos',
        element: <TodosLayout />,
        loader: todosLoader,
        children: [
          { index: true, element: <TodoEmptyState /> },
          // TODO(横展開): ここに 'new' と ':todoId' を足す。
          //   new     … <Form method="post"> + action。送信後に遷移する
          //   :todoId … loader で 1 件取得。親（一覧）の loader は再実行されない
        ],
      },
      // TODO(横展開): 'settings'（Passkey 管理・ログアウト）は Phase 5 で使う
    ],
  },
]);
