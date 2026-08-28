import { NavLink, Outlet } from 'react-router';
import { clearAccessToken } from '../lib/token-store';

/**
 * `/app` 配下の外枠。ヘッダと <Outlet />（docs/03-frontend.md 3.1 の図）。
 *
 * このコンポーネントは「認証済みかどうか」を一切気にしない。
 * それは同じルートの loader（requireAuthLoader）の仕事で、
 * loader が通らなければここは描画されないため。
 */
export function AppLayout(): React.JSX.Element {
  return (
    <div>
      <header>
        <NavLink to="/app/todos">Todo</NavLink>
        <button
          type="button"
          onClick={() => {
            clearAccessToken();
            // Phase 4 まで仮。トークンを捨ててから素の遷移でリロードする
            window.location.assign('/login');
          }}
        >
          ログアウト
        </button>
      </header>
      <Outlet />
    </div>
  );
}
