import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { beginLogin, isCognitoConfigured, safeReturnTo } from './cognito';

/**
 * ログイン画面（Phase 4）。**Cognito に飛ばすだけ**の画面。
 *
 * ★ Phase A の「トークンを手で貼る」フォームはここで捨てた。
 *   入力欄が 1 つも無いのが正しい状態で、パスワードはこの画面を通らない。
 *
 * ★ 自動でリダイレクトせず、ボタンを押させている。
 *   自動にすると、Cognito 側でエラーが起きたときに /login と Cognito の間で
 *   無限に往復する。原因を読める場所を残しておく方が、実装中の事故が軽い。
 */
export function LoginPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  // ★ from をそのまま使わない。外から与えられる値なので検証を通す（cognito.ts の safeReturnTo）
  const from = safeReturnTo(searchParams.get('from'));
  const configured = isCognitoConfigured();

  // callback loader が失敗したときに ?error= で飛ばしてくる。これが無いと
  // 「ログイン画面に戻されたが理由が分からない」状態になる
  const oauthError = searchParams.get('error');

  return (
    <main style={{ maxWidth: '32rem', margin: '4rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>ToDoApli</h1>

      {configured ? (
        <p>ログインすると、自分の Todo だけが表示されます。</p>
      ) : (
        <p role="alert">
          Cognito の設定が読み込まれていません。<code>pnpm run env:sync</code> を実行して、
          dev サーバーを再起動してください。
        </p>
      )}

      {/* React は文字列を必ずエスケープして描画するので、ここに HTML を差し込まれることはない */}
      {oauthError === null ? null : <p role="alert">{oauthError}</p>}
      {error === null ? null : <p role="alert">{error}</p>}

      <button
        type="button"
        disabled={!configured}
        onClick={() => {
          // async をイベントハンドラで扱う。challenge の計算に await が要る
          beginLogin(from)
            .then((url) => window.location.assign(url))
            .catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : 'ログインを開始できませんでした');
            });
        }}
      >
        ログイン
      </button>
    </main>
  );
}
