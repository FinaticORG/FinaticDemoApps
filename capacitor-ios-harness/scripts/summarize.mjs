#!/usr/bin/env node
/**
 * Summarize harness events.jsonl + matrix.json into summary.json / summary.md.
 * Usage: node scripts/summarize.mjs <outDir>
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function summarize(events, matrix = {}) {
  const modes = {};
  const gates = new Set();
  const mode = (m) =>
    (modes[m] ||= {
      cycles: {},
      raw_messages_by_type: {},
      raw_message_origins: {},
      oauth: { host_observed_surface: [], classification: [] },
      broker_connection_created: [],
      consent_route_rendered: [],
      backend_refresh: [],
      tests: {},
    });
  for (const e of events) {
    if (e.evt === 'gate' && e.gate) gates.add(e.gate + (e.secret ? ':' + e.secret : ''));
    const m = e.mode && e.mode !== 'unset' ? e.mode : null;
    if (!m) continue;
    const s = mode(m);
    const test = e.test || 'app';
    const cycleKey = test + '#' + (e.cycle ?? 0);
    const c = (s.cycles[cycleKey] ||= {
      test,
      cycle: e.cycle ?? 0,
      opens: 0,
      raw_portal_close: 0,
      on_close: 0,
      browser_finished: 0,
      host_close_requests: 0,
      portal_x_taps: 0,
    });
    switch (e.evt) {
      case 'open_requested':
        c.opens += 1;
        break;
      case 'raw_message':
        s.raw_messages_by_type[e.payload_type] = (s.raw_messages_by_type[e.payload_type] || 0) + 1;
        s.raw_message_origins[e.origin] = (s.raw_message_origins[e.origin] || 0) + 1;
        if (e.payload_type === 'portal-close') c.raw_portal_close += 1;
        break;
      case 'on_close':
        c.on_close += 1;
        break;
      case 'browser_finished':
        c.browser_finished += 1;
        break;
      case 'host_close_requested':
        c.host_close_requests += 1;
        break;
      case 'ui_portal_x_tapped':
        c.portal_x_taps += 1;
        break;
      case 'portal_event':
        if (e.lifecycle_stage === 'broker_connection_created') s.broker_connection_created.push(e.wall_ms);
        if (e.classification) s.oauth.classification.push(e.classification);
        break;
      case 'ui_consent_route_rendered':
        s.consent_route_rendered.push(e.wall_ms);
        break;
      case 'ui_oauth_surface':
        s.oauth.host_observed_surface.push(e.surface);
        break;
      case 'oauth_classification':
        s.oauth.classification.push(e.classification);
        break;
      case 'backend_refresh':
        s.backend_refresh.push({ ok: e.ok, account_count: e.account_count, reason: e.reason });
        break;
      case 'ui_test_result':
        s.tests[e.test] = e.status;
        break;
      default:
        break;
    }
  }
  for (const s of Object.values(modes)) {
    const consent = s.consent_route_rendered[0];
    const bcc = s.broker_connection_created[0];
    s.broker_connection_created_delta_ms =
      typeof consent === 'number' && typeof bcc === 'number' ? bcc - consent : null;
    s.cycles = Object.values(s.cycles).filter((c) => c.opens || c.raw_portal_close || c.on_close || c.browser_finished);
    if (s.oauth.classification.length === 0) s.oauth.classification = ['unobserved'];
  }
  return { matrix, gates: [...gates], modes };
}

function toMarkdown(summary) {
  const lines = ['## FIN-13157 Capacitor iOS harness', ''];
  lines.push(summary.gates.length ? '**GATED:** ' + summary.gates.join(', ') : '**Gates:** none recorded');
  lines.push('', '### Matrix', '', '| key | value |', '|---|---|');
  for (const [k, v] of Object.entries(summary.matrix)) lines.push('| ' + k + ' | ' + String(v).replace(/\|/g, '/') + ' |');
  for (const [m, s] of Object.entries(summary.modes)) {
    lines.push('', '### Mode: ' + m, '');
    lines.push('- tests: ' + JSON.stringify(s.tests));
    lines.push('- raw messages by type: ' + JSON.stringify(s.raw_messages_by_type));
    lines.push('- raw message origins: ' + JSON.stringify(s.raw_message_origins));
    lines.push('- OAuth host-observed surface: ' + JSON.stringify(s.oauth.host_observed_surface) + '; classification: ' + JSON.stringify(s.oauth.classification));
    lines.push('- broker_connection_created delta vs consent render (ms): ' + s.broker_connection_created_delta_ms);
    lines.push('- backend refresh: ' + JSON.stringify(s.backend_refresh));
    lines.push('', '| test | cycle | opens | raw portal-close | onClose | browserFinished | host close req | portal-X taps |', '|---|---|---|---|---|---|---|---|');
    for (const c of s.cycles) {
      lines.push('| ' + [c.test, c.cycle, c.opens, c.raw_portal_close, c.on_close, c.browser_finished, c.host_close_requests, c.portal_x_taps].join(' | ') + ' |');
    }
  }
  return lines.join('\n') + '\n';
}

export function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const outDir = process.argv[2] || 'harness-out';
  const matrixPath = join(outDir, 'matrix.json');
  const matrix = existsSync(matrixPath) ? JSON.parse(readFileSync(matrixPath, 'utf8')) : {};
  const summary = summarize(readJsonl(join(outDir, 'events.jsonl')), matrix);
  writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  const md = toMarkdown(summary);
  writeFileSync(join(outDir, 'summary.md'), md);
  process.stdout.write(md);
}
