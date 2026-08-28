/**
 * ドメインの不変条件違反を表す基底クラス。
 *
 * ドメイン層は HTTP を知らないので、ここには status code を書かない。
 * HTTP への対応づけは ProblemJsonFilter が一手に引き受ける
 * （docs/04-backend.md 4.2「Domain は NestJS を import しない」）。
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * 「自分のものとして存在しない」を表す。
 *
 * 他人のリソースを指定した場合もこれになる。403 ではなく 404 を返すことで、
 * リソースの存在有無そのものを漏らさない（docs/02-domain-and-api.md 2.4）。
 */
export abstract class ResourceNotFoundError extends DomainError {}
