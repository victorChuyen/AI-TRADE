import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { migrationGate } from '../migration-gate.mjs';

function call(method, path) {
  const result = { status: 200, passed: false, body: null };
  const response = {
    status(value) { result.status = value; return this; },
    json(value) { result.body = value; return this; },
  };
  migrationGate({ method, path }, response, () => { result.passed = true; });
  return result;
}

for (const path of ['/api/v1/mt4/verify', '/api/v1/mt5/verify', '/api/v1/real/account/verify', '/api/v1/trade/history', '/api/v1/auth/login', '/API/v1/MT5/verify']) {
  test(`blocks unverified mutation ${path}`, () => {
    const result = call('POST', path);
    assert.equal(result.status, 503);
    assert.equal(result.passed, false);
    assert.equal(result.body.success, false);
    assert.equal(result.body.verified, false);
  });
}
test('blocks history deletion', () => assert.equal(call('DELETE', '/api/v1/trade/history').status, 503));
test('never grants account identity or live access', () => {
  const result = call('GET', '/api/v1/me');
  assert.equal(result.body.authenticated, false);
  assert.equal(result.body.user_id, null);
  assert.equal(result.body.live_execution_unlocked, false);
  assert.equal(result.passed, false);
});
test('allows read-only routes and static assets', () => {
  assert.equal(call('GET', '/api/v1/trade/history').passed, true);
  assert.equal(call('GET', '/src/main.tsx').passed, true);
});

test('HTTP boundary blocks a legacy success handler before it runs', async () => {
  const app = express();
  let legacyCalled = false;
  app.use(migrationGate);
  app.post('/api/v1/mt5/verify', (_req, res) => {
    legacyCalled = true;
    res.json({ success: true });
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/mt5/verify`, { method: 'POST' });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).verified, false);
    assert.equal(legacyCalled, false);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
