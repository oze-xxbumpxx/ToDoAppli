import { redirect, type LoaderFunctionArgs } from 'react-router';
import { setAccessToken, setIdToken } from '../lib/token-store';
import { consumeAuthRequest, exchangeCodeForTokens } from './cognito';

/**
 * Cognito からの戻り先（docs/05-auth.md 5.1 の 3〜5）。
 *
 * ★ コンポーネントではなく loader に置いた理由:
 *   コードの交換は「画面を描く前に終わっていてほしい」処理で、useEffect に書くと
 *   StrictMode で 2 回走り、**2 回目が必ず失敗する**（認可コードは 1 回しか使えない）。
 *   loader はナビゲーションごとに 1 度だけ走るので、この形が素直。
 *
 * 成功したらトークンをメモリに置いて、元いた場所へ redirect する。
 * この画面自体は一瞬も表示されない。
 */
export async function callbackLoader({ request }: LoaderFunctionArgs): Promise<Response> {
  const url = new URL(request.url);

  // Cognito がエラーを返した場合（ユーザーが同意しなかった等）はここに載ってくる
  const oauthError = url.searchParams.get('error');
  if (oauthError !== null) {
    const detail = url.searchParams.get('error_description') ?? oauthError;
    throw redirect(`/login?error=${encodeURIComponent(detail)}`);
  }

  // ★ /passkeys/add からの戻りは code を持たず、代わりに result を持つ。
  //   ここを書かないと「登録したのにログイン画面に戻される」だけになり、
  //   成功したのか失敗したのか利用者に分からない
  const result = url.searchParams.get('result');
  if (result !== null) {
    if (result === 'invalid_session') {
      throw redirect('/login?error=' + encodeURIComponent('セッションが切れていました。ログインし直してから登録してください。'));
    }
    // 登録の成否にかかわらず、トークンはこの往復で失われている（メモリ保管・D-1）。
    // ログイン画面に戻し、Cognito のセッションが生きていれば実質素通りで戻ってくる
    throw redirect('/login?notice=' + encodeURIComponent('Passkey の登録手続きが終わりました。もう一度ログインしてください。'));
  }

  const code = url.searchParams.get('code');
  if (code === null) {
    throw redirect('/login');
  }

  // state の照合と verifier の取り出し。取り出した時点で sessionStorage からは消える
  const { verifier, returnTo } = consumeAuthRequest(url.searchParams.get('state'));

  const tokens = await exchangeCodeForTokens(code, verifier);
  setAccessToken(tokens.accessToken);
  setIdToken(tokens.idToken);

  // ★ replace ではなく通常の redirect でよい。ブラウザバックで戻っても
  //   code は使用済みなので、/login に落ちるだけで害が無い
  return redirect(returnTo);
}
