import { defineConfig } from 'vitest/config';

// Domain と UseCase の単体テストが主対象（docs/04-backend.md 4.6）。
// どちらも NestJS の DI を経由せず直接 new して検証するので、
// emitDecoratorMetadata は不要。
//
// 拡張子が .mts なのは、apps/api が CommonJS（NestJS の既定）だから。
// .ts のままだと Vite が CJS として読み込もうとして警告が出る。
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // Phase 1 時点では src/todos/ が空なのでテストが 0 件になる。
    // 0 件を失敗扱いにすると CI が赤になるため許容する。
    // 横展開でテストを書き始めたら false に戻してよい。
    passWithNoTests: true,
  },
});
