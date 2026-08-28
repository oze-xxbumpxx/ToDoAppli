import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { ApiError } from '../lib/api-client';
import { clearAccessToken } from '../lib/token-store';

/**
 * loader / action が投げた例外の受け皿（docs/02-domain-and-api.md 2.5）。
 *
 * ★ このコンポーネントを**どのルートに置くか**が設計。router.tsx を見ると、
 *   - `/app`        … ここで捕まえるとヘッダごと差し替わる
 *   - `/app/todos`  … 一覧の取得に失敗したとき。ヘッダは残る
 *   - `:todoId`     … 詳細だけ失敗したとき。**左ペインの一覧は残る**
 *   エラーは「一番近い errorElement」まで浮上するので、置く場所で
 *   「どこまで壊れて見えるか」が決まる。
 */
export function RouteErrorBoundary(): React.JSX.Element {
  const error = useRouteError();

  // ★ 副作用を render の中に書かない。トークン破棄は effect に置く
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      clearAccessToken();
    }
  }, [error]);

  if (error instanceof ApiError) {
    // 401 だけは自動で /login に飛ばさず、理由を出してからリンクを見せる。
    // 黙って飛ばすと「なぜ戻されたのか」が分からず、Phase 4 の切り替え時に切り分けできない
    if (error.status === 401) {
      return (
        <section>
          <h2>ログインが切れました</h2>
          <p>トークンが無効か期限切れです。取り直してください。</p>
          <Link to="/login">ログイン画面へ</Link>
        </section>
      );
    }

    if (error.status === 404) {
      return (
        <section>
          <h2>見つかりません</h2>
          {/* 他人の Todo も 404 で返る（2.4）。画面上でも区別しないのが正しい */}
          <p>すでに削除されたか、URL が違います。</p>
          <Link to="/app/todos">一覧へ戻る</Link>
        </section>
      );
    }

    return (
      <section>
        <h2>エラー {error.status}</h2>
        <p>{error.problem.detail}</p>
      </section>
    );
  }

  // React Router 自身が投げたもの（未定義のパスなど）。ApiError とは別物なので分けて扱う
  if (isRouteErrorResponse(error)) {
    return (
      <section>
        <h2>
          {error.status} {error.statusText}
        </h2>
        <Link to="/app/todos">一覧へ戻る</Link>
      </section>
    );
  }

  return (
    <section>
      <h2>予期しないエラー</h2>
      <p>{error instanceof Error ? error.message : String(error)}</p>
    </section>
  );
}
