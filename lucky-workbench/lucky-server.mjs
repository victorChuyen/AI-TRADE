import { createServer as createViteServer } from 'vite';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createLuckyApi } from './lucky-api.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const exec = promisify(execFile);
const port = Number(process.env.PORT || 8766);
const app = createLuckyApi({ dataDir: path.join(root, '.local-data'), probe: async () => {
  const { stdout } = await exec(process.env.LUCKY_PYTHON || 'python', ['-B', path.join(root, 'backend/lucky_mt5_read.py')], { timeout: 15000, maxBuffer: 128000, windowsHide: true });
  return JSON.parse(stdout);
} });
if (process.env.NODE_ENV === 'production') app.use(express.static(path.join(root, 'dist')));
else {
  const vite = await createViteServer({ root, server: { middlewareMode: true, hmr: false }, appType: 'spa' });
  app.use(vite.middlewares);
}
const server = app.listen(port, '127.0.0.1', () => console.log(`Lucky local research: http://127.0.0.1:${port} — broker execution disabled`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
