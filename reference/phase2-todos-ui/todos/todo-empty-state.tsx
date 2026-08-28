/**
 * `/app/todos` の index ルート。右ペインに何も選ばれていないときの表示。
 *
 * 「一覧だけ表示して右が空」という状態を**ルートとして持つ**のが data mode の作法。
 * 親コンポーネントの中で `selectedId === null` を分岐するのではない。
 */
export function TodoEmptyState(): React.JSX.Element {
  return <p>左の一覧から Todo を選んでください。</p>;
}
