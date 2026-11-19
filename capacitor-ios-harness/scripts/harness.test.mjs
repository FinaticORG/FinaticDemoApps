import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { classifyMessage, createRecorder, redactString, sanitizeEvent, urlShape } from '../src/instrumentation.js';
import { createHarnessServer, extractOneTimeToken, SECRET_NAME } from './mint-server.mjs';
import { summarize } from './summarize.mjs';

const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

test('sanitizeEvent drops non-allowlisted keys and redacts identities', () => {
  const out = sanitizeEvent({
    evt: 'x',
    token: fakeJwt,
    userId: 'u',
    email: 'a@b.co',
    detail: 'user a@b.co token=' + fakeJwt + ' id 123e4567-e89b-12d3-a456-426614174000',
    count: 2,
  });
  assert.deepEqual(Object.keys(out).sort(), ['count', 'detail', 'evt']);
  assert.ok(!out.detail.includes('a@b.co'));
  assert.ok(!out.detail.includes(fakeJwt));
  assert.ok(!out.detail.includes('123e4567'));
});

test('urlShape keeps host and id-free path only', () => {
  const s = urlShape('https://staging-portal.finatic.dev/session/abcdef0123456789abcdef?token=' + fakeJwt + '#x');
  assert.equal(s.url_host, 'staging-portal.finatic.dev');
  assert.equal(s.url_path, '/session/:id');
  assert.equal(redactString(fakeJwt), '[redacted]');
});

test('classifyMessage keeps type, origin and lifecycle stage but not payload', () => {
  const close = classifyMessage({ origin: 'https://staging-portal.finatic.dev', data: { type: 'portal-close' } });
  assert.deepEqual(close, { origin: 'https://staging-portal.finatic.dev', payload_type: 'portal-close', event_name: undefined, lifecycle_stage: undefined });
  const lc = classifyMessage({
    origin: 'https://p',
    data: { type: 'portal-event', eventName: 'portal.lifecycle', payload: { stage: 'broker_connection_created', connectionId: 'c1' } },
  });
  assert.equal(lc.lifecycle_stage, 'broker_connection_created');
  assert.equal(JSON.stringify(lc).includes('c1'), false);
  assert.equal(classifyMessage({ origin: '', data: JSON.stringify({ type: 'portal-close' }) }).payload_type, 'portal-close');
  assert.equal(classifyMessage({ origin: 'x', data: 'hello' }).payload_type, 'string:unparsed');
});

test('recorder stamps schema, seq, context and fans out to sinks', () => {
  const lines = [];
  const r = createRecorder({ sinks: [(json) => lines.push(JSON.parse(json))], now: () => 42 });
  r.setContext({ mode: 'embedded', cycle: 2 });
  r.emit('on_close', { on_close_count: 1, userId: 'secret-user' });
  assert.equal(lines[0].schema, 'fin13157.harness.v1');
  assert.equal(lines[0].mode, 'embedded');
  assert.equal(lines[0].cycle, 2);
  assert.equal(lines[0].wall_ms, 42);
  assert.equal(lines[0].userId, undefined);
});

test('extractOneTimeToken supports v1 envelopes', () => {
  assert.equal(extractOneTimeToken({ success: { data: { one_time_token: 't1' } } }), 't1');
  assert.equal(extractOneTimeToken({ data: { one_time_token: 't2' } }), 't2');
  assert.equal(extractOneTimeToken({}), null);
});

async function withServer(opts, fn) {
  const outDir = mkdtempSync(join(tmpdir(), 'harness-'));
  const server = createHarnessServer({ outDir, ...opts });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    await fn(base, outDir);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

test('collector gates explicitly when the staging secret is absent', async () => {
  await withServer({ apiKey: '' }, async (base, outDir) => {
    const cfg = await (await fetch(base + '/config')).json();
    assert.equal(cfg.gate, 'missing_secret');
    const res = await fetch(base + '/token', { method: 'POST' });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.secret, SECRET_NAME);
    assert.match(readFileSync(join(outDir, 'events.jsonl'), 'utf8'), /missing_secret/);
  });
});

test('collector mints via session/init without logging the key or token', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, headers: init.headers });
    return new Response(JSON.stringify({ success: { data: { one_time_token: fakeJwt } } }), { status: 200 });
  };
  await withServer({ apiKey: 'sk_test_SHOULD_NOT_LEAK_0123456789abcdef', apiUrl: 'https://api-staging.finatic.dev', fetchImpl }, async (base, outDir) => {
    const res = await fetch(base + '/token', { method: 'POST' });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).token, fakeJwt);
    assert.equal(calls[0].url, 'https://api-staging.finatic.dev/api/v1/session/init');
    assert.equal(calls[0].headers['X-Finatic-Environment'], 'sandbox');
    await fetch(base + '/events', { method: 'POST', body: JSON.stringify({ evt: 'ui_test_start', test: 't1', mode: 'embedded' }) });
    await fetch(base + '/events', { method: 'POST', body: JSON.stringify({ evt: 'on_close', mode: 'embedded', token: fakeJwt }) });
    const log = readFileSync(join(outDir, 'events.jsonl'), 'utf8');
    assert.ok(!log.includes('SHOULD_NOT_LEAK'));
    assert.ok(!log.includes(fakeJwt));
    const lines = log.trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(lines.at(-1).test, 't1');
    assert.equal(typeof lines.at(-1).rx_ms, 'number');
  });
});

test('collector stores screenshots under a sanitized name', async () => {
  await withServer({ apiKey: '' }, async (base, outDir) => {
    await fetch(base + '/screenshot?name=../evil name', { method: 'POST', body: new Uint8Array([137, 80, 78, 71]) });
    assert.ok(existsSync(join(outDir, 'screenshots', '.._evil_name.png')));
  });
});

test('summarize builds per-mode cycle matrix and bcc delta', () => {
  const ev = (evt, f = {}) => ({ evt, mode: 'embedded', test: 't3', cycle: 1, ...f });
  const s = summarize(
    [
      ev('open_requested'),
      ev('raw_message', { payload_type: 'portal-close', origin: 'https://p' }),
      ev('on_close'),
      ev('ui_consent_route_rendered', { wall_ms: 1000 }),
      ev('portal_event', { lifecycle_stage: 'broker_connection_created', wall_ms: 1750 }),
      { evt: 'gate', gate: 'missing_secret', secret: SECRET_NAME },
    ],
    { xcode: '16.4' },
  );
  const m = s.modes.embedded;
  assert.equal(m.cycles[0].raw_portal_close, 1);
  assert.equal(m.cycles[0].on_close, 1);
  assert.equal(m.broker_connection_created_delta_ms, 750);
  assert.deepEqual(m.oauth.classification, ['unobserved']);
  assert.deepEqual(s.gates, ['missing_secret:' + SECRET_NAME]);
});
