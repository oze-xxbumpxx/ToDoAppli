import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { setAccessToken } from '../lib/token-store';

/**
 * ★ 仮のログイン画面。**Phase 4 で丸ごと捨てます。**
 *
 * いまは Cognito が無いので、`pnpm run token` で発行した開発用トークンを
 * 手で貼るだけ。凝る価値がないので凝っていない。
 *
 * 唯一まともなのは「トークンをメモリにしか置かない」ところ（決定 D-1）。
 * ここを localStorage にすると Phase 4 で直すのを忘れる。
 */
export function LoginPage(): React.JSX.Element {
  const [token, setToken] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const from = searchParams.get('from') ?? '/app/todos';

  return (
    <main>
      <h1>ログイン（仮）</h1>
      <p>
        <code>pnpm run token</code> で発行したトークンを貼ってください。
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setAccessToken(token.trim());
          void navigate(from, { replace: true });
        }}
      >
        <textarea
          value={token}
          onChange={(event) => setToken(event.target.value)}
          rows={4}
          cols={60}
          aria-label="アクセストークン"
        />
        <button type="submit">入る</button>
      </form>
    </main>
  );
}
