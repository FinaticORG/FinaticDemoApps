# Capacitor iOS harness (FinaticConnect#618)

A minimal Capacitor 8 iOS app that installs the **published** `@finatic/client` (pinned to
`1.1.6`) and reproduces the reported Capacitor iOS behavior on a GitHub-hosted iOS Simulator
against **Connect staging** (sandbox broker, synthetic identity). It is a test-access build
for FIN-13156 / FIN-10419. It does not give a repro verdict.

## Host modes

| Mode | Path under test |
|---|---|
| **Browser** | `FinaticConnect.init(token)` → `v1.getPortalUrl()` → `@capacitor/browser` (SFSafariViewController) → `browserFinished` → backend refresh (`v1.listAccounts`) |
| **Embedded** | `FinaticConnect.init(token)` → `openPortal({ onClose, onEvent, … })`, so the portal iframe sits inside the Capacitor WKWebView |

## Instrumentation (sanitized JSON lines, schema `fin13157.harness.v1`)

Each event goes to three places:

- `console`
- the unified device log (`HarnessLog` plugin, subsystem `dev.finatic.harness`, exported to `device-events.jsonl`)
- the runner-local collector (`events.jsonl`)

Recorded data:

- `raw_message`: every `window` message, with origin and payload type only (for example `portal-close`). The listener is registered before the SDK, so messages that the SDK drops are still recorded.
- `on_close` and `browser_finished`, with running counts per cycle.
- `portal_event`: lifecycle stage (`portal_authenticated`, `broker_connection_created`, …) with presence flags only. No ids are kept.
- XCUITest observations (`ui_*`):
  - portal-X, host-close and SFSafariViewController Done taps
  - where the mock OAuth page rendered (`in_app_webview`, `same_sfsafariviewcontroller`, `external_safari`, `none_observed`)
  - when the consent route rendered
  - per-test expectations, as `met` or `unmet`
- `summary.json` / `summary.md`:
  - per-mode, per-cycle counts (opens, raw `portal-close`, `onClose`, `browserFinished`)
  - the `broker_connection_created` delta from the consent-route render
  - the OAuth classification. Connect's internal `same_document` / `fallback` / `broker_popup` value is only recorded when it is visible to the host. Otherwise it is reported as `unobserved` next to the host-observed surface.

The sanitizer works from an allowlist. It drops tokens, emails, user, session, connection and account ids, and query strings. See `src/instrumentation.js` and `scripts/harness.test.mjs`.

Product behavior is recorded as expectations rather than asserted, so a run that reproduces the bug still produces complete evidence. XCUITest fails only when the harness itself is broken.

## Credentials and gates

- Minting a portal token needs a Connect **staging sandbox** company API key. The key lives only in the runner-local collector (`scripts/mint-server.mjs`, bound to `127.0.0.1:8787`) and comes from the repository Actions secret **`FINATIC_STAGING_SANDBOX_API_KEY`**. It never enters the app bundle, logs or artifacts.
- If the secret is absent, the run is still instrumented. It records `gate: missing_secret`, the portal tests skip, and the Verdict step fails with `GATED`.
- Never commit a key: this repo is public.
- No live brokers, live financial actions or customer data. Linux Playwright WebKit is not a substitute for this harness.

## CI

Workflow file: `.github/workflows/capacitor-ios-harness.yml`.

- **Triggers:** `workflow_dispatch`, plus PRs that touch this folder.
- **Runner:** `macos-15`.
- **Steps:** `npm ci` → unit tests → `cap add/sync ios` (SPM) → wire `HarnessBridgeViewController` and the `AppUITests` target (`scripts/add-harness-targets.rb`) → boot the named simulator `FIN13157-Harness` → `xcodebuild test` → upload the artifact `fin13157-ios-harness-<run>`.

The artifact contains:

- `matrix.json`: Xcode, iOS runtime, device, Capacitor and `@finatic/client` versions, app SHA, and the Connect staging SHA
- `events.jsonl` and `device-events.jsonl`
- `summary.json` and `summary.md`
- `screenshots/`
- `xcodebuild.log` and `HarnessUITests.xcresult`

Dispatch inputs:

- `connect_staging_sha` (default `291c3764…`, the staging deployment from 2026-11-18)
- `oauth_broker`: an optional staging sandbox OAuth broker id to preselect
- `runner`
- `device_type`

## Local

```bash
npm ci && npm test && npm run build
HARNESS_PORT=18787 node scripts/mint-server.mjs &   # web-only smoke: open dist with ?collector=http://127.0.0.1:18787
npm run ios:prepare                                  # macOS only (Ruby xcodeproj)
```
