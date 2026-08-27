import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * ★ ここが Phase 2 の入口です。
 *
 * いまは骨格だけ。下のプレースホルダを
 *
 *   <RouterProvider router={router} />
 *
 * に置き換えるのが最初の一歩になります（手本は reference/ を参照）。
 */
const container = document.getElementById('root');
if (container === null) {
  throw new Error('#root が index.html にありません');
}

createRoot(container).render(
  <StrictMode>
    <p>Phase 2 未実装。apps/web/README.md を読んでください。</p>
  </StrictMode>,
);
