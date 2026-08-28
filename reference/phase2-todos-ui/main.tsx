import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { router } from './router';

/**
 * data mode（決定 D-3）の入口。
 *
 * RouterProvider を 'react-router' ではなく **'react-router/dom'** から取るのは、
 * こちらが View Transition のために flushSync を挟むブラウザ向けの実装だから。
 * 型はどちらも同じなので、間違えても動いてしまう。だから意識して選ぶ。
 */
const container = document.getElementById('root');
if (container === null) {
  throw new Error('#root が index.html にありません');
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
