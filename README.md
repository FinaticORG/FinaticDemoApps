# Finatic Demo Apps

Reference demo applications for Finatic SDKs. The v1 demos use the account-first
flow: create a session for a company account, open Connect, grant access to a
financial account, read account data, and verify incoming webhooks.

## Demo Tracks

| Path | SDK Focus | Staging Override |
|---|---|---|
| `client/demo-app` | `@finatic/client` (Next.js) | Use `FINATIC_STAGING_API_URL` / `NEXT_PUBLIC_FINATIC_STAGING_API_URL` = `https://api-staging.finatic.dev` |
| `server-node/demo-app` | `@finatic/server-node` | Set `FINATIC_API_URL=https://api-staging.finatic.dev` |
| `server-python/demo-app` | `finatic-server-python` | Set `FINATIC_API_URL=https://api-staging.finatic.dev` |

## FDX v1 Flow

1. Create a session with `/api/v1/sessions` or the server SDK v1 facade.
2. Open a portal link for the returned `sessionId`.
3. Complete Connect and grant read access to a financial account.
4. Read account data through `/api/v1/accounts` or SDK `v1` account helpers.
5. Verify webhook receiver signatures with `FINATIC_WEBHOOK_SECRET`.

Identity terms used by the demos:
- `companyAccountId` is the customer workspace account.
- `accountId` is the linked financial account used in `/api/v1/accounts/{accountId}`.
- provider connection ids are internal and are not used as public resources.

## Environment Targets

- **Client demo (`client/demo-app`)**: keep environment-specific URL keys and point staging URL values to `https://api-staging.finatic.dev`.
- **Client simple demo (`client/simple-demo-app`)**: set `VITE_FINATIC_ENVIRONMENT=sandbox` or `live`.
- **Server Node demo (`server-node/demo-app`)**: in `.env`, set `FINATIC_API_URL=https://api-staging.finatic.dev` and `FINATIC_ENVIRONMENT=sandbox` or `live`.
- **Server Python demo (`server-python/demo-app`)**: in `.env`, set `FINATIC_API_URL=https://api-staging.finatic.dev` and `FINATIC_ENVIRONMENT=sandbox` or `live`.

## Quick Start

- `client/demo-app`
- `server-node/demo-app`
- `server-python/demo-app`

## Related Testing App

For broader end-to-end validation flows, use `../testing/FinaticTester`.

## Docs

- SDK docs: [https://finatic.dev/docs](https://finatic.dev/docs)
- API reference: [https://finatic.dev/docs/api-reference](https://finatic.dev/docs/api-reference)
