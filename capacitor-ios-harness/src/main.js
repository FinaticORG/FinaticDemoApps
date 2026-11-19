import { FinaticConnect } from '@finatic/client';
import { Browser } from '@capacitor/browser';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { classifyMessage, createRecorder, redactString, urlShape } from './instrumentation.js';

// Runner-local collector + token mint (scripts/mint-server.mjs). The company
// API key lives only in that runner process; this bundle never sees it.
// `?collector=` is only for local web smoke tests; the iOS app uses the default.
const COLLECTOR = new URLSearchParams(location.search).get('collector') || 'http://127.0.0.1:8787';
const SDK_VERSION = __FINATIC_CLIENT_VERSION__;
const CAPACITOR_VERSION = __CAPACITOR_VERSION__;

const HarnessLog = registerPlugin('HarnessLog');

const counters = {
  open: 0,
  rawClose: 0,
  onClose: 0,
  browserFinished: 0,
  brokerConnectionCreated: 0,
  portalAuthenticated: 0,
  refreshOk: 0,
};
const state = { mode: 'embedded', cycle: 0, gate: 'none', ready: 0, lastEvt: 'boot', busy: 0 };
let finatic = null;
let harnessConfig = null;

function postToCollector(json) {
  fetch(COLLECTOR + '/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json,
    keepalive: true,
  }).catch(() => {});
}

const recorder = createRecorder({
  clock: () => performance.now(),
  sinks: [
    (json) => console.log('HARNESS_EVT ' + json),
    (json) => {
      if (Capacitor.isNativePlatform()) HarnessLog.log({ line: json }).catch(() => {});
    },
    postToCollector,
  ],
});

function emit(evt, fields) {
  recorder.emit(evt, fields);
  state.lastEvt = evt;
  render();
}

function render() {
  const s = document.getElementById('harness-state');
  if (!s) return;
  s.textContent =
    'HSTATE mode=' + state.mode +
    ' cycle=' + state.cycle +
    ' open=' + counters.open +
    ' rawClose=' + counters.rawClose +
    ' onClose=' + counters.onClose +
    ' browserFinished=' + counters.browserFinished +
    ' bcc=' + counters.brokerConnectionCreated +
    ' authed=' + counters.portalAuthenticated +
    ' refreshOk=' + counters.refreshOk +
    ' gate=' + state.gate +
    ' ready=' + state.ready +
    ' busy=' + state.busy +
    ' last=' + state.lastEvt;
}

function errorFields(error) {
  return {
    error_name: (error && error.name) || 'Error',
    error_message: redactString((error && error.message) || String(error), 140),
  };
}

// Raw message capture is registered before the SDK so it sees every message,
// including ones the SDK drops for origin mismatch.
window.addEventListener(
  'message',
  (event) => {
    const c = classifyMessage(event);
    if (c.payload_type === 'portal-close') counters.rawClose += 1;
    emit('raw_message', { ...c, raw_close_count: counters.rawClose });
  },
  true,
);

document.addEventListener('visibilitychange', () => {
  emit('visibility', { visibility: document.visibilityState });
});

async function loadConfig() {
  if (harnessConfig) return harnessConfig;
  const res = await fetch(COLLECTOR + '/config');
  harnessConfig = await res.json();
  return harnessConfig;
}

async function ensureSdk() {
  if (finatic) return finatic;
  const cfg = await loadConfig();
  emit('token_mint_request', { api_host: cfg.apiHost });
  const res = await fetch(COLLECTOR + '/token', { method: 'POST' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token) {
    state.gate = body.gate || 'token_mint_failed';
    emit('gate', {
      gate: state.gate,
      secret: body.secret,
      status: res.status,
      reason: body.reason,
    });
    throw new Error('GATED:' + state.gate);
  }
  emit('token_mint_result', { ok: true, status: res.status });
  finatic = await FinaticConnect.init(body.token, undefined, {
    baseUrl: cfg.apiUrl,
    apiEnvironment: cfg.apiEnvironment,
  });
  emit('sdk_initialized', { ok: true });
  return finatic;
}

function lifecycle(eventName, payload) {
  const fields = { event_name: String(eventName) };
  if (payload && typeof payload === 'object') {
    if (typeof payload.stage === 'string') fields.lifecycle_stage = payload.stage;
    fields.has_connection_id = typeof payload.connectionId === 'string';
    fields.has_broker_id = typeof payload.brokerId === 'string';
    fields.has_user_id = typeof payload.userId === 'string';
    if (typeof payload.brokerId === 'string') fields.broker_id = payload.brokerId;
    if (typeof payload.state === 'string') fields.connector_state = payload.state;
    if (typeof payload.completion_surface === 'string') fields.classification = payload.completion_surface;
  }
  if (fields.lifecycle_stage === 'broker_connection_created') counters.brokerConnectionCreated += 1;
  if (fields.lifecycle_stage === 'portal_authenticated') counters.portalAuthenticated += 1;
  emit('portal_event', fields);
}

async function refreshBackend(reason) {
  try {
    const result = await finatic.v1.listAccounts();
    const data = result && result.success && result.success.data;
    const count = Array.isArray(data) ? data.length : Array.isArray(data && data.items) ? data.items.length : -1;
    counters.refreshOk += 1;
    emit('backend_refresh', { ok: true, reason, account_count: count });
  } catch (error) {
    emit('backend_refresh', { ok: false, reason, ...errorFields(error) });
  }
}

let browserListenersReady = false;
async function ensureBrowserListeners() {
  if (browserListenersReady) return;
  browserListenersReady = true;
  await Browser.addListener('browserPageLoaded', () => emit('browser_page_loaded', {}));
  await Browser.addListener('browserFinished', async () => {
    counters.browserFinished += 1;
    emit('browser_finished', { browser_finished_count: counters.browserFinished });
    // Dismissal alone is not success: refresh backend broker connections.
    await refreshBackend('browser_finished');
  });
}

async function openPortal({ hostCloseAfterMs } = {}) {
  if (state.busy) return;
  state.busy = 1;
  state.cycle += 1;
  counters.open += 1;
  recorder.setContext({ mode: state.mode, cycle: state.cycle });
  emit('open_requested', { count: counters.open, phase: hostCloseAfterMs ? 'host_close_scheduled' : 'user_close' });
  try {
    const sdk = await ensureSdk();
    const brokers = harnessConfig && harnessConfig.oauthBroker ? [harnessConfig.oauthBroker] : undefined;
    if (state.mode === 'browser') {
      await ensureBrowserListeners();
      const url = await sdk.v1.getPortalUrl({});
      emit('portal_url_resolved', { ...urlShape(url) });
      await Browser.open({ url, presentationStyle: 'fullscreen' });
      emit('browser_opened', {});
    } else {
      await sdk.openPortal({
        brokers,
        onSuccess: (userId) => emit('on_success', { has_user_id: Boolean(userId) }),
        onError: (error) => emit('on_error', errorFields(error)),
        onClose: () => {
          counters.onClose += 1;
          emit('on_close', { on_close_count: counters.onClose, raw_close_count: counters.rawClose });
        },
        onEvent: lifecycle,
      });
      emit('portal_opened', {});
    }
    if (hostCloseAfterMs) {
      setTimeout(() => hostClose('scheduled'), hostCloseAfterMs);
    }
  } catch (error) {
    emit('open_failed', errorFields(error));
  } finally {
    state.busy = 0;
    render();
  }
}

async function hostClose(why) {
  emit('host_close_requested', { close_kind: 'host', reason: why });
  try {
    if (state.mode === 'browser') {
      await Browser.close();
    } else if (finatic) {
      finatic.closePortal();
    }
    emit('host_close_done', { close_kind: 'host' });
  } catch (error) {
    emit('host_close_failed', errorFields(error));
  }
}

function setMode(mode) {
  state.mode = mode;
  recorder.setContext({ mode, cycle: state.cycle });
  emit('mode_selected', {});
}

function button(label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}

function mount() {
  const root = document.getElementById('app');
  const row = document.createElement('div');
  row.className = 'row';
  row.append(
    button('Mode Browser', () => setMode('browser')),
    button('Mode Embedded', () => setMode('embedded')),
    button('Open portal', () => openPortal()),
    button('Open portal host close 8s', () => openPortal({ hostCloseAfterMs: 8000 })),
    button('Host close', () => hostClose('button')),
    button('Refresh backend', () => (finatic ? refreshBackend('manual') : emit('backend_refresh', { ok: false, reason: 'no_sdk' }))),
  );
  root.append(row);
  render();
  const ua = navigator.userAgent.match(/AppleWebKit\/([\d.]+)/);
  emit('app_ready', {
    sdk_version: SDK_VERSION,
    capacitor_version: CAPACITOR_VERSION,
    platform: Capacitor.getPlatform(),
    ua_webkit: ua ? ua[1] : 'unknown',
  });
  state.ready = 1;
  render();
  loadConfig()
    .then((cfg) => emit('config_loaded', { api_host: cfg.apiHost, gate: cfg.gate || 'none', broker_id: cfg.oauthBroker || 'unset' }))
    .catch((error) => emit('config_failed', errorFields(error)));
}

mount();
