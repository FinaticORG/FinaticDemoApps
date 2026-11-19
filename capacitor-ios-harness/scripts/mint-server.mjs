#!/usr/bin/env node
/**
 * Runner-local token mint + event collector for the Capacitor iOS harness.
 *
 * - Binds to 127.0.0.1 only (the iOS Simulator shares the runner's loopback).
 * - POST /token mints a 90-second one-time token from Connect staging with
 *   FINATIC_STAGING_SANDBOX_API_KEY. The key never leaves this process and is
 *   never logged. Without the key it returns 503 with an explicit gate.
 * - POST /events appends sanitized JSON lines to $HARNESS_OUT/events.jsonl.
 * - POST /screenshot?name= stores PNG bytes from XCUITest under screenshots/.
 */
import { createServer } from 'node:http';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sanitizeEvent, SCHEMA } from '../src/instrumentation.js';

export const SECRET_NAME = 'FINATIC_STAGING_SANDBOX_API_KEY';

export function extractOneTimeToken(payload) {
  return (
    payload?.success?.data?.one_time_token ??
    payload?.data?.one_time_token ??
    payload?.one_time_token ??
    null
  );
}

export function createHarnessServer({
  outDir,
  apiKey = process.env[SECRET_NAME] || '',
  apiUrl = process.env.FINATIC_API_URL || 'https://api-staging.finatic.dev',
  apiEnvironment = process.env.FINATIC_API_ENVIRONMENT || 'sandbox',
  oauthBroker = process.env.HARNESS_OAUTH_BROKER || '',
  fetchImpl = fetch,
} = {}) {
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  const eventsPath = join(outDir, 'events.jsonl');
  let mintCount = 0;
  let currentTest = 'none';

  const record = (event) => {
    const line = sanitizeEvent({ schema: SCHEMA, ...event });
    // XCUITest announces each test; app events are stamped with it so the
    // summary groups app + UI events into the same per-test cycle rows.
    if (line.evt === 'ui_test_start' && line.test) currentTest = line.test;
    if (!line.test) line.test = currentTest;
    line.rx_ms = Date.now();
    appendFileSync(eventsPath, JSON.stringify(line) + '\n');
  };

  const send = (res, status, body) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end(JSON.stringify(body));
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });

  const apiHost = (() => {
    try {
      return new URL(apiUrl).host;
    } catch {
      return 'invalid';
    }
  })();

  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    try {
      if (req.method === 'OPTIONS') return send(res, 204, {});
      if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });
      if (req.method === 'GET' && url.pathname === '/config') {
        return send(res, 200, {
          apiUrl,
          apiHost,
          apiEnvironment,
          oauthBroker,
          gate: apiKey ? 'none' : 'missing_secret',
        });
      }
      if (req.method === 'POST' && url.pathname === '/token') {
        if (!apiKey) {
          record({ source: 'collector', evt: 'gate', gate: 'missing_secret', secret: SECRET_NAME });
          return send(res, 503, {
            gate: 'missing_secret',
            secret: SECRET_NAME,
            reason: 'Repository Actions secret is not provisioned; portal token cannot be minted.',
          });
        }
        mintCount += 1;
        const upstream = await fetchImpl(apiUrl.replace(/\/$/, '') + '/api/v1/session/init', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            'X-Finatic-Environment': apiEnvironment,
          },
          body: '{}',
        });
        const payload = await upstream.json().catch(() => ({}));
        const token = extractOneTimeToken(payload);
        record({
          source: 'collector',
          evt: 'token_mint_upstream',
          status: upstream.status,
          ok: Boolean(token),
          count: mintCount,
        });
        if (!upstream.ok || !token) {
          return send(res, 502, { gate: 'token_mint_failed', reason: 'upstream status ' + upstream.status });
        }
        return send(res, 200, { token });
      }
      if (req.method === 'POST' && url.pathname === '/events') {
        const raw = (await readBody(req)).toString('utf8');
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return send(res, 400, { error: 'invalid json' });
        }
        record(parsed);
        return send(res, 204, {});
      }
      if (req.method === 'POST' && url.pathname === '/screenshot') {
        const name = (url.searchParams.get('name') || 'shot').replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 80);
        const bytes = await readBody(req);
        writeFileSync(join(outDir, 'screenshots', name + '.png'), bytes);
        return send(res, 204, {});
      }
      return send(res, 404, { error: 'not found' });
    } catch (error) {
      record({ source: 'collector', evt: 'collector_error', error_name: error?.name || 'Error' });
      return send(res, 500, { error: 'collector error' });
    }
  });
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const outDir = process.env.HARNESS_OUT || join(process.cwd(), 'harness-out');
  const port = Number(process.env.HARNESS_PORT || 8787);
  createHarnessServer({ outDir }).listen(port, '127.0.0.1', () => {
    console.log('harness collector listening on 127.0.0.1:' + port + ' out=' + outDir + ' secret=' + (process.env[SECRET_NAME] ? 'present' : 'absent'));
  });
}
