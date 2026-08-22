// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * コーディング規約は Google TypeScript Style Guide（docs/09-coding-standards.md）。
 * ファイル名の snake_case だけは NestJS CLI の出力に合わせるため強制しない（例外 1）。
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.js',
      '**/*.mjs',
      // 手本は相対 import が src/todos/ に置かれて初めて解決するため、
      // ここでは対象外。写した先（apps/api/src/todos/）で lint される。
      'reference/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // prefer-readonly など型情報が要るルールのために型付き lint を有効にする
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ---- Google TypeScript Style Guide ----
  {
    rules: {
      // G-1 default export 禁止
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'G-1: default export は使わない（docs/09-coding-standards.md）',
        },
        {
          selector: 'TSEnumDeclaration[const=true]',
          message: 'G-8: const enum は使わない',
        },
      ],
      // G-2 `_` プレフィックス／サフィックス禁止
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'forbid' },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        { selector: 'objectLiteralProperty', format: null },
        { selector: 'typeProperty', format: null },
        { selector: 'classProperty', modifiers: ['static', 'readonly'], format: ['UPPER_CASE', 'camelCase'] },
      ],
      // G-3 オブジェクト型は interface
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      // G-4 public は書かない
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'no-public' },
      ],
      // G-6 再代入しないものは readonly
      '@typescript-eslint/prefer-readonly': 'error',
      // G-7 any 禁止
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // ---- 層をまたぐ依存の禁止（docs/04-backend.md 4.3） ----
  // アーキテクチャは規約文書ではなく lint で保つ。
  {
    files: ['apps/api/src/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', '@nestjs'],
              message: 'domain 層はフレームワークに依存してはいけない（4.3）。DI は module 側の useFactory で解決する。',
            },
            {
              group: ['@prisma/*', '**/prisma/**', '.prisma/*'],
              message: 'domain 層は Prisma に依存してはいけない（4.3）。',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/*', '**/prisma/**', '.prisma/*'],
              message: 'application 層は Prisma に依存してはいけない（4.3）。Repository の interface だけを見ること。',
            },
            {
              group: ['**/infrastructure/**'],
              message: 'application 層は infrastructure の実装を直接 import してはいけない（4.3）。',
            },
          ],
        },
      ],
    },
  },

  // NestJS のデコレータは decorator metadata を要求するため、パラメータプロパティを許可する（G-5）
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/parameter-properties': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },

  // 開発用スクリプトは console を許可
  {
    files: ['apps/api/tools/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  // 例外 3: 設定ファイルはローダーの仕様上 default export が必須
  // （docs/09-coding-standards.md 9.3）。例外を設定に書くことで、例外が増えないようにする。
  {
    files: ['**/*.config.ts', '**/*.config.mts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
