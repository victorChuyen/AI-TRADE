import express from 'express';
import crypto from 'node:crypto';
import { mkdir, appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { instruments, strategies, fixture, analyze } from './lucky-engine.mjs';

export function createLuckyApi({ dataDir, probe = async () => ({ connected: false, status: 'NOT_CONFIGURED', message: 'Probe chưa cấu hình.' }) }) {
  const app = express();
  const token = crypto.randomBytes(32).toString('hex');
  let terminal = { connected: false, status: 'NOT_CHECKED', message: 'Chưa kiểm tra terminal. Không có số dư hoặc giá broker.' };
  let busy = false;
  const journalFile = path.join(dataDir, 'journal.jsonl');
  async function journal(event, detail) {
    const record = { id: crypto.randomUUID(), time: new Date().toISOString(), event, detail };
    await mkdir(dataDir, { recursive: true });
    await appendFile(journalFile, JSON.stringify(record) + '\n');
    return record;
  }
  app.use((req, res, next) => {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(req.hostname)) return res.status(403).json({ error: 'LOCAL_HOST_ONLY' });
    const origin = req.get('origin');
    if (origin && origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({ error: 'ORIGIN_REJECTED' });
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('x-lucky-token') !== token) return res.status(403).json({ error: 'TOKEN_REQUIRED' });
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  app.get('/api/lucky/status', (_req, res) => res.json({ token, source: 'LOCAL_API', instruments: instruments.map(({ base, ...x }) => x), strategies, terminal,
    execution: { enabled: false, reason: 'Chưa nghiệm thu broker, chiến lược và cấu hình rủi ro.' }, ai: { enabled: false, reason: 'Chưa cấu hình model/API. Bộ phân tích hiện tại dùng quy tắc.' } }));
  app.get('/api/lucky/market/:symbol', (req, res) => {
    if (!instruments.some(x => x.id === req.params.symbol)) return res.status(400).json({ error: 'UNKNOWN_SYMBOL' });
    res.json({ source: 'SYNTHETIC_FIXTURE', dataset: 'waveform-v1', timeframe: 'M15', candles: fixture(req.params.symbol) });
  });
  app.post('/api/lucky/analyze', async (req, res, next) => {
    try {
      const { symbol, strategy } = req.body;
      if (!instruments.some(x => x.id === symbol) || !strategies.some(x => x.id === strategy)) return res.status(400).json({ error: 'INVALID_SELECTION' });
      const report = { ...analyze(fixture(symbol), strategy), symbol };
      await journal('RESEARCH_RUN', `${symbol} / ${strategy} / waveform-v1 / synthetic / không đặt lệnh`);
      res.json(report);
    } catch (error) { next(error); }
  });
  app.post('/api/lucky/terminal/probe', async (_req, res, next) => {
    if (busy) return res.status(409).json({ error: 'PROBE_BUSY' });
    busy = true;
    terminal = { connected: false, status: 'CHECKING', message: 'Đang kiểm tra.' };
    try {
      const result = await probe();
      if (!result || typeof result.connected !== 'boolean' || typeof result.status !== 'string') throw new Error('INVALID_PROBE');
      terminal = { ...result, checkedAt: new Date().toISOString() };
      await journal('TERMINAL_CHECK', terminal.status); // Never persist account balance/identity.
      res.json(terminal);
    } catch (error) {
      terminal = { connected: false, status: 'PROBE_FAILED', message: 'Không đọc được terminal; không dùng dữ liệu cũ.', checkedAt: new Date().toISOString() };
      try { await journal('TERMINAL_CHECK', 'PROBE_FAILED'); } catch (journalError) { return next(journalError); }
      res.status(503).json(terminal);
    } finally { busy = false; }
  });
  app.get('/api/lucky/journal', async (_req, res, next) => {
    try {
      const raw = await readFile(journalFile, 'utf8').catch(error => { if (error.code === 'ENOENT') return ''; throw error; });
      const records = raw.split('\n').filter(Boolean).slice(-200).map(line => JSON.parse(line));
      res.json({ records: records.reverse(), source: 'LOCAL_JOURNAL' });
    } catch (error) { next(error); }
  });
  app.use('/api', (_req, res) => res.status(403).json({ success: false, error: 'EXECUTION_DISABLED', message: 'Không có API đặt/sửa/đóng lệnh trong bản local research.' }));
  app.use((error, _req, res, _next) => res.status(error.status === 400 ? 400 : 500).json({ error: error.status === 400 ? 'INVALID_JSON' : 'LOCAL_API_ERROR' }));
  return app;
}
