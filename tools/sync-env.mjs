#!/usr/bin/env node
/**
 * terraform の output を、そのまま各アプリの .env に流し込む（docs/06-infra-ci.md 6.2）。
 *
 * ★ 手でコピペしないためのスクリプト。コンソールから ID を写して .env に貼るなら、
 *   Terraform を使う意味が半分消える。「作った結果が、そのまま使う側の設定になる」までが IaC。
 *
 *   使い方: pnpm run env:sync
 *
 * .env が無ければ .env.example から作り、既にあるキーは値だけ差し替える。
 * 既存の DATABASE_URL や PORT には触らない。
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** terraform を repo 直下から呼ぶ。-chdir があるので cd して回る必要はない */
function terraformOutputs() {
  const raw = execFileSync('terraform', ['-chdir=infra', 'output', '-json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const parsed = JSON.parse(raw);
  return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, value.value]));
}

/** 既存の .env を 1 行ずつ見て、対象キーだけ置き換える。順序とコメントは保つ */
function applyEnv(path, examplePath, values) {
  if (!existsSync(path)) {
    copyFileSync(examplePath, path);
    console.log(`  ${path} を .env.example から作成しました`);
  }

  const lines = readFileSync(path, 'utf8').split('\n');
  const remaining = new Map(Object.entries(values));

  const next = lines.map((line) => {
    const match = /^([A-Z0-9_]+)=/.exec(line);
    if (match === null) return line;
    const key = match[1];
    if (!remaining.has(key)) return line;
    const value = remaining.get(key);
    remaining.delete(key);
    return `${key}="${value}"`;
  });

  // .env.example に無いキーが増えた場合だけ末尾に足す
  for (const [key, value] of remaining) {
    next.push(`${key}="${value}"`);
  }

  writeFileSync(path, next.join('\n'));
  for (const key of Object.keys(values)) {
    console.log(`  ${key} を更新しました`);
  }
}

const out = terraformOutputs();
const required = ['issuer_url', 'user_pool_client_id', 'login_domain'];
const missing = required.filter((key) => out[key] === undefined);
if (missing.length > 0) {
  console.error(`terraform の output に ${missing.join(', ')} がありません。apply は済んでいますか。`);
  process.exit(1);
}

console.log('apps/api/.env');
applyEnv(join(repoRoot, 'apps/api/.env'), join(repoRoot, 'apps/api/.env.example'), {
  COGNITO_ISSUER: out['issuer_url'],
  COGNITO_CLIENT_ID: out['user_pool_client_id'],
});

console.log('apps/web/.env');
applyEnv(join(repoRoot, 'apps/web/.env'), join(repoRoot, 'apps/web/.env.example'), {
  VITE_COGNITO_DOMAIN: out['login_domain'],
  VITE_COGNITO_CLIENT_ID: out['user_pool_client_id'],
});

console.log('\n完了。API を再起動すると新しい設定が読まれます。');
