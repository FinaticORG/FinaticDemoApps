# Sandbox 12-Provider Walkthrough

Use this checklist when validating FDX v1 sandbox mode end-to-end with the demo
apps or FinaticTester. All twelve sandbox providers are defined in FinaticCore's
FDX provider matrix.

## Prerequisites

1. API running in **sandbox** mode (`APP_MODE=sandbox` or `FINATIC_ENVIRONMENT=sandbox`).
2. A company workspace account with an API key or session.
3. Finatic API URL and sandbox environment configured for the selected demo.
4. Webhook receiver URL + `FINATIC_WEBHOOK_SECRET` if testing delivery.

## Flow (every provider)

1. Mint a one-time token (`POST /api/v1/session/init` or SDK `v1.getToken()` / `v1.get_token()`).
2. Open Connect (`v1.getPortalUrl()` / `openPortal`).
3. Select the provider in Connect and complete auth (OAuth, credentials, or push-agent as required).
4. Grant **read** access to at least one financial account.
5. Confirm the grant via `GET /api/v1/account-grants` (or SDK `v1.listAccountGrants`).
6. Read account data: `GET /api/v1/accounts`, then balances/orders/positions for the Finatic account UUID.
7. Optional: place/cancel a sandbox order when `canTrade` is enabled.
8. Optional: verify `account.grant.*` and `account.sync.*` webhooks at your receiver.

## Provider checklist

| # | Provider ID | Auth | Sync path | Notes |
|---|-------------|------|-----------|-------|
| 1 | `alpaca` | OAuth | pull | Paper credentials may differ from live |
| 2 | `etoro` | OAuth | pull | SSO / OIDC flow |
| 3 | `fidelity` | username/password | pull | Credential-based |
| 4 | `interactive_brokers` | API key | pull | Gateway / paper supported |
| 5 | `mt4` | push agent | push_only | Requires MT connector EA |
| 6 | `mt5` | push agent | push_only | Requires MT connector EA |
| 7 | `ninja_trader` | OAuth | pull | Tradovate-backed |
| 8 | `robinhood` | username/password | pull | Credential-based |
| 9 | `tasty_trade` | OAuth | pull | OAuth + paper |
| 10 | `tradestation` | OAuth | pull | OAuth + paper |
| 11 | `trading212` | API key | pull | Equity-only API |
| 12 | `webull` | OAuth | pull | OAuth flow |

## Demo app entry points

| App | Command | Sandbox env |
|-----|---------|-------------|
| `client/demo-app` | `npm run dev` | `VITE_FINATIC_ENVIRONMENT=sandbox` |
| `server-node/demo-app` | `npm run dev` | `FINATIC_ENVIRONMENT=sandbox` in `.env` |
| `server-python/demo-app` | `python demo_cli.py` | `FINATIC_ENVIRONMENT=sandbox` in `.env` |

Use the client demo app for browser-based v1 flow validation, or FinaticTester **Portal** + **Grants** + **Portfolio** workspaces for broader coverage.

## Pass criteria

- Grant appears in `account-grants` with `status=active` and `canRead=true`.
- `listAccounts` returns the linked financial account (Finatic UUID in `id`).
- Balances/orders/positions return 200 for that account UUID (empty arrays are OK for new links).
- Webhook receiver logs `account.grant.created` (and optionally `account.sync.completed`) with valid signature.

## Staging smoke (subset)

For staging issue-branch validation, exercise at least **three** pull providers (e.g.
`alpaca`, `tasty_trade`, `webull`) plus one **push_only** provider (`mt5`) if the
connector is available in the environment.
