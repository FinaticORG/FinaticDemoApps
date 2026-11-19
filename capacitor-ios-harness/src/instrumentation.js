/**
 * Host-side instrumentation for the FinaticConnect#618 Capacitor iOS harness.
 *
 * Every event is one JSON line under a fixed schema. Only allowlisted keys and
 * sanitized scalar values survive: no tokens, emails, user/session/connection
 * identifiers, or full URLs (only origin/host/path shape).
 */

export const SCHEMA = 'fin13157.harness.v1';

const ALLOWED_KEYS = new Set([
  'schema', 'seq', 't_ms', 'wall_ms', 'source', 'mode', 'cycle', 'evt',
  'origin', 'payload_type', 'event_name', 'lifecycle_stage', 'close_kind',
  'raw_close_count', 'on_close_count', 'browser_finished_count', 'count',
  'ok', 'status', 'reason', 'gate', 'secret', 'step', 'surface',
  'classification', 'account_count', 'delta_ms', 'visibility', 'url_host',
  'url_path', 'error_name', 'error_message', 'has_connection_id',
  'has_broker_id', 'has_user_id', 'broker_id', 'connector_state', 'phase',
  'note', 'observed_by', 'test', 'detail', 'present', 'app_state',
  'sdk_version', 'capacitor_version', 'platform', 'ua_webkit', 'api_host',
]);

// Harness-authored identifiers (event, test and step names). They are not
// identity-bearing, so they are restricted to a safe charset instead of being
// token-redacted. Long test names would otherwise trip the token pattern.
const IDENT_KEYS = new Set([
  'schema', 'source', 'mode', 'evt', 'test', 'step', 'phase', 'close_kind', 'surface', 'gate', 'secret',
]);

const EMAIL_RE = /[^\s@]+@[^\s@]+/g;
const LONG_TOKEN_RE = /[A-Za-z0-9_\-.~+/=]{32,}/g;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const BEARERISH_RE = /(bearer|token|secret|key|password|otp|code)\s*[:=]\s*\S+/gi;

export function redactString(value, max = 160) {
  let s = String(value);
  s = s.replace(BEARERISH_RE, '$1=[redacted]');
  s = s.replace(UUID_RE, '[id]');
  s = s.replace(EMAIL_RE, '[email]');
  s = s.replace(LONG_TOKEN_RE, '[redacted]');
  return s.length > max ? s.slice(0, max) + '…' : s;
}

/** Reduce a URL to origin + id-free path; never keep query or fragment. */
export function urlShape(raw) {
  try {
    const u = new URL(raw);
    const path = u.pathname
      .split('/')
      .map((seg) => (seg.length >= 16 || /\d{4,}/.test(seg) ? ':id' : seg))
      .join('/');
    return { url_host: u.host, url_path: redactString(path, 120) };
  } catch {
    return { url_host: 'unparseable', url_path: '' };
  }
}

export function sanitizeEvent(event) {
  const out = {};
  for (const [key, value] of Object.entries(event || {})) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (typeof value === 'string') {
      if (IDENT_KEYS.has(key)) out[key] = value.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 80);
      else out[key] = key === 'origin' ? redactString(value, 120) : redactString(value);
    }
  }
  return out;
}

/**
 * Classify a raw window message without retaining its payload. Only the
 * message type / portal event name / lifecycle stage are kept.
 */
export function classifyMessage(event) {
  const data = event && event.data;
  let payloadType = typeof data;
  let eventName;
  let lifecycleStage;
  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = null;
    }
  }
  if (parsed && typeof parsed === 'object') {
    payloadType = typeof parsed.type === 'string' ? parsed.type : 'object:untyped';
    if (typeof parsed.eventName === 'string') eventName = parsed.eventName;
    const payload = parsed.payload;
    if (payload && typeof payload === 'object' && typeof payload.stage === 'string') {
      lifecycleStage = payload.stage;
    }
  } else if (typeof data === 'string') {
    payloadType = 'string:unparsed';
  }
  return {
    origin: event && typeof event.origin === 'string' ? event.origin || '(empty)' : '(none)',
    payload_type: payloadType,
    event_name: eventName,
    lifecycle_stage: lifecycleStage,
  };
}

export function createRecorder({ sinks = [], now = () => Date.now(), clock = () => 0 } = {}) {
  let seq = 0;
  const base = { mode: 'unset', cycle: 0 };
  return {
    setContext(ctx) {
      Object.assign(base, ctx);
    },
    context() {
      return { ...base };
    },
    emit(evt, fields = {}) {
      seq += 1;
      const line = sanitizeEvent({
        schema: SCHEMA,
        seq,
        t_ms: Math.round(clock()),
        wall_ms: now(),
        source: 'app',
        ...base,
        ...fields,
        evt,
      });
      const json = JSON.stringify(line);
      for (const sink of sinks) {
        try {
          sink(json, line);
        } catch {
          // A failing sink must never break the host flow under test.
        }
      }
      return line;
    },
  };
}
