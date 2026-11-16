import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function git(args: string): string {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig(({ command }) => {
  // Cloudflare Workers Builds provides WORKERS_CI_*; fall back to local git.
  const commit = (process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || git('rev-parse HEAD') || 'unknown').slice(0, 7);
  const branch = process.env.WORKERS_CI_BRANCH || process.env.GITHUB_REF_NAME || git('rev-parse --abbrev-ref HEAD') || 'local';
  const channel = command === 'serve' ? 'dev' : branch === 'main' ? 'production' : 'preview';
  return {
    plugins: [react(), tailwindcss()],
    worker: { format: 'es' },
    build: { target: 'es2022', sourcemap: false },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __APP_COMMIT__: JSON.stringify(commit),
      __APP_BRANCH__: JSON.stringify(branch),
      __APP_CHANNEL__: JSON.stringify(channel),
      __APP_BUILT_AT__: JSON.stringify(new Date().toISOString()),
    },
  };
});
