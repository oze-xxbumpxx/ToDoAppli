import { NavLink, Outlet, useNavigation } from 'react-router';
import { logoutUrl } from '../auth/cognito';
import { readEmailFromIdToken } from '../auth/id-token';
import { clearAccessToken, getIdToken } from '../lib/token-store';
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

  // ★ 表示用。API から取っていないのは、Cognito のアクセストークンに email が
  //   入らないため（apps/api の authenticated-user.ts のコメント）。
  //   ID トークンは検証していないので、表示以外に使ってはいけない
  const email = readEmailFromIdToken(getIdToken());

  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <NavLink to="/app/todos">Todo</NavLink>
        {/* aria-busy にしておくと、見た目を作り込まなくても支援技術には伝わる */}
        <span aria-busy={navigation.state !== 'idle'}>
          {navigation.state === 'idle' ? '' : '通信中…'}
        </span>
        {email === null ? null : <small>{email}</small>}
        <button
          type="button"
          onClick={() => {
            // ★ 手元のトークンを捨てるだけでは足りない。Cognito 側のセッション Cookie が
            //   残っていると、次のログインで何も聞かれずに入れてしまう。
            //   だから Cognito のログアウト URL へ遷移させる
            clearAccessToken();
            window.location.assign(logoutUrl());
          }}
        >
          ログアウト
        </button>
      </header>
      <Outlet />
    </div>
  );
}
