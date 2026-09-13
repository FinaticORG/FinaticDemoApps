# Finatic Demo Apps

Reference demo applications for Finatic SDKs. All demos use the v1 account-first
flow: mint a one-time token or portal URL, complete Connect, grant a financial
account, then read `v1.listAccounts` / account-scoped data.

## Demo Tracks

| Path | SDK Focus | Staging Override |
|---|---|---|
| `client/demo-app` | `@finatic/client` (React + Vite) | Set `VITE_FINATIC_API_URL=https://api-staging.finatic.dev` |
| `server-node/demo-app` | `@finatic/server-node` | Set `FINATIC_API_URL=https://api-staging.finatic.dev` |
| `server-python/demo-app` | `finatic-server-python` | Set `FINATIC_API_URL=https://api-staging.finatic.dev` |

## v1 flow

1. Server: `new FinaticServer(apiKey)` + `v1.getToken()`, or `v1.startSession()` then `v1.getPortalUrl()` / `v1.get_portal_url()`.
2. Browser: `FinaticConnect.init(token)` + `openPortal({ onEvent })`.
3. Wait for `account.grant.created` (or confirm Connect in the CLI demos).
4. Read `v1.listAccounts` then account-scoped methods.
5. Verify webhook catalog / HMAC with `FINATIC_WEBHOOK_SECRET`.

Identity terms:
- `companyAccountId` is the partner workspace.
- `accountId` is the granted financial account used in `/api/v1/accounts/{accountId}`.

## Environment Targets

- **Client demo (`client/demo-app`)**: set `FINATIC_API_KEY` (server-only), `VITE_FINATIC_ENVIRONMENT=sandbox` or `live`, and `VITE_FINATIC_API_URL` for staging. Never put the company key in a `VITE_` variable.
- **Server Node demo (`server-node/demo-app`)**: in `.env`, set `FINATIC_API_URL=https://api-staging.finatic.dev` and `FINATIC_ENVIRONMENT=sandbox` or `live`.
- **Server Python demo (`server-python/demo-app`)**: in `.env`, set `FINATIC_API_URL=https://api-staging.finatic.dev` and `FINATIC_ENVIRONMENT=sandbox` or `live`.

## SDK versions

Demo apps target **Finatic SDK v1.0.0** (`@finatic/client`, `@finatic/server-node`,
`finatic-server-python`). Published installs use npm/PyPI `^1.0.0`.

When developing inside the Finatic orchestrator monorepo, install local SDK builds:

```bash
# client/demo-app
npm install @finatic/client@file:../../../SDKs/Client/FinaticClientSDK

# server-node/demo-app
npm install @finatic/server-node@file:../../../SDKs/Server/FinaticServerSDK-Node
```

CI and external clones resolve `^1.0.0` from npm/PyPI once packages are published.

## Quick Start

- `client/demo-app`
- `server-node/demo-app`
- `server-python/demo-app`

## Related Testing App

For broader end-to-end validation flows, use `../testing/FinaticTester`.

## Docs

This README is the demo-app index. Fetch the rest before writing a full integration:

- Quick start: [https://finatic.dev/docs/quick-start/quick-start](https://finatic.dev/docs/quick-start/quick-start)
- Client SDK README: [https://github.com/FinaticORG/FinaticClientSDK/blob/develop/README.md](https://github.com/FinaticORG/FinaticClientSDK/blob/develop/README.md)
- Node SDK README: [https://github.com/FinaticORG/FinaticServerSDK-Node/blob/develop/README.md](https://github.com/FinaticORG/FinaticServerSDK-Node/blob/develop/README.md)
- Python SDK README: [https://github.com/FinaticORG/FinaticServerSDK-Python/blob/develop/README.md](https://github.com/FinaticORG/FinaticServerSDK-Python/blob/develop/README.md)
- Embed Connect: [https://github.com/FinaticORG/FinaticConnect/blob/develop/docs/embedding.md](https://github.com/FinaticORG/FinaticConnect/blob/develop/docs/embedding.md)
- API reference: [https://finatic.dev/docs/api-reference](https://finatic.dev/docs/api-reference)
- OpenAPI: [https://finatic.dev/openapi.json](https://finatic.dev/openapi.json)
- Agent index: [https://finatic.dev/llms.txt](https://finatic.dev/llms.txt)
- Agent notes: [https://finatic.dev/AGENTS.md](https://finatic.dev/AGENTS.md)
- Sandbox 12-provider walkthrough: [`docs/sandbox-12-provider-walkthrough.md`](docs/sandbox-12-provider-walkthrough.md)
