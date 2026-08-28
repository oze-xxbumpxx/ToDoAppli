import type { TodoResponse, TodoStatus } from '@todoapli/shared';
import { redirect, type ActionFunctionArgs } from 'react-router';
import { ApiError, apiFetch } from '../lib/api-client';
import { requireTodoId } from './todo-detail.loader';
import { isTodoStatus } from './todo-status';

/**
 * action がフォームに**返す**エラー（throw しない）。
 *
 * ★ 400 / 422 と 404 / 401 を分けるのがこのファイルの設計判断（docs/02 の 2.5）。
 *   - 400（DTO 違反）と 422（F-09 のタイトル重複）は**そのフォームの入力の問題**。
 *     入力内容を残したままメッセージを出したいので、**返す**（useActionData で受け取る）。
 *   - 404 / 401 / 500 はフォームの問題ではない。画面ごと差し替えたいので **throw** し、
 *     errorElement に任せる。
 */
export interface TodoFormError {
  readonly message: string;
  readonly status: number;
}

interface CreateTodoBody {
  readonly title: string;
  readonly description?: string;
  readonly dueDate?: string;
}

interface UpdateTodoBody {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: TodoStatus;
}

/**
 * 新規作成（F-04）。`<Form method="post">` から呼ばれる。
 *
 * ★ なぜ useFetcher ではなく Form か:
 *   作成後に**作った Todo の詳細へ遷移したい**から（docs/03-frontend.md 3.2）。
 *   「送信した結果、別の画面に行くか？」が Form と useFetcher の判断基準で、
 *   ここは Yes。だから redirect() を返せる Form + action が正しい。
 */
export async function createTodoAction({
  request,
}: ActionFunctionArgs): Promise<Response | TodoFormError> {
  const form = await request.formData();
  const title = readText(form, 'title') ?? '';
  const description = readText(form, 'description');
  const dueDate = readText(form, 'dueDate');

  // 空文字は「未入力」。送ると @IsISO8601 / @MaxLength に当たって 400 になるのでキーごと落とす
  const body: CreateTodoBody = {
    title,
    ...(description === null ? {} : { description }),
    ...(dueDate === null ? {} : { dueDate }),
  };

  try {
    const created = await apiFetch<TodoResponse>('/todos', { method: 'POST', body });
    // 絞り込み条件（search）は捨てない。作成前に見ていた一覧の状態のまま詳細に移る
    return redirect(`/app/todos/${created.id}${new URL(request.url).search}`);
  } catch (error) {
    return toFormError(error);
  }
}

/**
 * 詳細ルートの action。**更新（PATCH）と削除（DELETE）の両方**を受ける。
 *
 * ★ 分岐の基準を `request.method` にしてあるので、フォーム側に
 *   `<input type="hidden" name="intent">` のような自前の目印が要らない。
 *   HTTP のメソッドがそのまま意図になっている。
 *
 * この action の呼び出し元は 3 つある。呼び分けの理由はそれぞれの component 側に書いた。
 *   1. 詳細画面の編集フォーム   … useFetcher（遷移しない）
 *   2. 詳細画面の削除ボタン     … Form（一覧へ遷移する）
 *   3. 一覧の完了トグル         … useFetcher（一覧に留まる。F-06）
 */
export async function todoDetailAction({
  request,
  params,
}: ActionFunctionArgs): Promise<Response | TodoResponse | TodoFormError> {
  const todoId = requireTodoId(params.todoId);

  if (request.method === 'DELETE') {
    await apiFetch<void>(`/todos/${todoId}`, { method: 'DELETE' });
    // 削除した Todo の詳細には戻れないので一覧へ。絞り込み条件は保つ
    return redirect(`/app/todos${new URL(request.url).search}`);
  }

  try {
    return await apiFetch<TodoResponse>(`/todos/${todoId}`, {
      method: 'PATCH',
      body: toUpdateBody(await request.formData()),
    });
  } catch (error) {
    return toFormError(error);
  }
}

/**
 * FormData を PATCH の body に直す。
 *
 * ★ `Object.fromEntries(form)` で済ませてはいけない。API 側は whitelist +
 *   forbidNonWhitelisted なので、DTO に無いキー（送信ボタンの name など）が
 *   1 つでも混ざると **400** になる。載せてよいキーだけを明示的に拾う。
 *
 * ★ 「送られていないキーは変更しない」が PATCH の意味（Controller の update() の
 *   コメント参照）。FormData に無いキーを body に載せないことで、それがそのまま実現する。
 *   完了トグルは status だけを送るので、title も description も無傷で残る。
 *
 * ★ 空文字は null（＝消す）に変換する。作成時（未入力＝送らない）と意味が違うのは、
 *   編集フォームでは「元々あった値を空にした」＝消したい、が唯一の解釈になるため。
 */
function toUpdateBody(form: FormData): UpdateTodoBody {
  const body: UpdateTodoBody = {};

  const title = readText(form, 'title');
  if (title !== null) {
    body.title = title;
  }

  // description / dueDate は has() で見る。空文字を「消す」に翻訳したいので readText では足りない
  if (form.has('description')) {
    body.description = readText(form, 'description');
  }
  if (form.has('dueDate')) {
    body.dueDate = readText(form, 'dueDate');
  }

  const status = form.get('status');
  if (isTodoStatus(status)) {
    body.status = status;
  }

  return body;
}

/** 未入力（空文字）と未送信を同じ null に潰す。FormData の値は string か File なので型も絞る。 */
function readText(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * フォームで表示できるエラーだけを返し、それ以外は投げ直す。
 *
 * 401 をここで拾って /login に飛ばしていない理由:
 * 失効はどの loader / action でも起きるので、対処は 1 か所（errorElement）に集める。
 * 認証ガードを `/app` に 1 つだけ置いた判断（3.4）と同じ考え方。
 */
function toFormError(error: unknown): TodoFormError {
  if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
    return { message: error.problem.detail, status: error.status };
  }
  throw error;
}
