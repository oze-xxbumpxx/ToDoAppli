import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './app/app-layout';
import { RouteErrorBoundary } from './app/route-error-boundary';
import { LoginPage } from './auth/login-page';
import { requireAuthLoader } from './auth/require-auth.loader';
import { TodoDetailPage } from './todos/todo-detail-page';
import { todoDetailLoader } from './todos/todo-detail.loader';
import { TodoEmptyState } from './todos/todo-empty-state';
import { TodoNewPage } from './todos/todo-new-page';
import { createTodoAction, todoDetailAction } from './todos/todo.actions';
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
 *
 * ★ errorElement を 3 段（/app, todos, :todoId）に置いてあるのは、
 *   エラーが「一番近い errorElement」まで浮上する性質を使って
 *   **壊れる範囲を閉じ込める**ため（route-error-boundary.tsx のコメント）。
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
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/app/todos" replace /> },
      {
        path: 'todos',
        element: <TodosLayout />,
        loader: todosLoader,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: <TodoEmptyState /> },
          // 作成は loader を持たない。表示するものが無く、フォームは空から始まるため
          {
            path: 'new',
            element: <TodoNewPage />,
            action: createTodoAction,
            errorElement: <RouteErrorBoundary />,
          },
          {
            // ★ 'new' より後に書いてあるが、静的セグメントが動的セグメントより
            //   優先されるので /app/todos/new が :todoId に食われることはない（順序に依存しない）
            path: ':todoId',
            element: <TodoDetailPage />,
            loader: todoDetailLoader,
            action: todoDetailAction,
            // ここに置くことで、詳細が 404 でも左ペインの一覧は生きたまま
            errorElement: <RouteErrorBoundary />,
          },
        ],
      },
      // TODO(Phase 5): 'settings'（Passkey 管理・ログアウト）
    ],
  },
]);
