import { NavLink, Outlet, useNavigation } from 'react-router';
import { clearAccessToken } from '../lib/token-store';
import styles from './app-layout.module.css';

/**
 * `/app` 配下の外枠。ヘッダと <Outlet />（docs/03-frontend.md 3.1 の図）。
 *
 * このコンポーネントは「認証済みかどうか」を一切気にしない。
 * それは同じルートの loader（requireAuthLoader）の仕事で、
 * loader が通らなければここは描画されないため。
 */
export function AppLayout(): React.JSX.Element {
  // ★ 通信中フラグを useState で持っていない。ルーターが状態を知っているので聞くだけでよい。
  //   これも状態管理ライブラリが要らない理由のひとつ（3.5）
  const navigation = useNavigation();

  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <NavLink to="/app/todos">Todo</NavLink>
        {/* aria-busy にしておくと、見た目を作り込まなくても支援技術には伝わる */}
        <span aria-busy={navigation.state !== 'idle'}>
          {navigation.state === 'idle' ? '' : '通信中…'}
        </span>
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
