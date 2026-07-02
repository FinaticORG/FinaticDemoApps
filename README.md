# Finatic Demo Apps

Reference demo applications for Finatic SDKs. All demos use the v1 account-first
flow: create a session for a company account, open Connect, grant access to a
financial account, read account data, and verify incoming webhooks.

## Demo Tracks

| Path | SDK Focus | Staging Override |
|---|---|---|
| `client/demo-app` | `@finatic/client` (React + Vite) | Set `VITE_FINATIC_API_URL=https://api-staging.finatic.dev` |
| `server-node/demo-app` | `@finatic/server-node` | Set `FINATIC_API_URL=https://api-staging.finatic.dev` |
| `server-python/demo-app` | `finatic-server-python` | Set `FINATIC_API_URL=https://api-staging.finatic.dev` |

## FDX v1 Flow

1. Create a session with `/api/v1/sessions` or the SDK v1 facade.
2. Open a portal link for the returned `sessionId`.
3. Complete Connect and grant read access to a financial account.
4. Read account data through `/api/v1/accounts` or SDK `v1` account helpers.
5. Verify webhook receiver signatures with `FINATIC_WEBHOOK_SECRET`.

Identity terms used by the demos:
- `companyAccountId` is the customer workspace account.
- `accountId` is the linked financial account used in `/api/v1/accounts/{accountId}`.

## Environment Targets

- **Client demo (`client/demo-app`)**: set `VITE_FINATIC_ENVIRONMENT=sandbox` or `live`, `VITE_FINATIC_API_URL` for staging, and `VITE_FINATIC_CONNECT_URL` when testing a non-default Connect host.
- **Server Node demo (`server-node/demo-app`)**: in `.env`, set `FINATIC_API_URL=https://api-staging.finatic.dev`, `FINATIC_ENVIRONMENT=sandbox` or `live`, and `FINATIC_CONNECT_URL` when testing a non-default Connect host.
- **Server Python demo (`server-python/demo-app`)**: in `.env`, set `FINATIC_API_URL=https://api-staging.finatic.dev`, `FINATIC_ENVIRONMENT=sandbox` or `live`, and `FINATIC_CONNECT_URL` when testing a non-default Connect host.

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

- SDK docs: [https://finatic.dev/docs](https://finatic.dev/docs)
- API reference: [https://finatic.dev/docs/api-reference](https://finatic.dev/docs/api-reference)
- Sandbox 12-provider walkthrough: [`docs/sandbox-12-provider-walkthrough.md`](docs/sandbox-12-provider-walkthrough.md)
