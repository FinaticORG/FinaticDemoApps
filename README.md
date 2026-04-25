# Finatic Demo Apps

Reference demo applications for Finatic SDKs.

## Demo Tracks

| Path | SDK Focus | Staging Override |
|---|---|---|
| `client/demo-app` | `@finatic/client` (Next.js) | Use `FINATIC_STAGING_API_URL` / `NEXT_PUBLIC_FINATIC_STAGING_API_URL` = `https://api-staging.finatic.dev` |
| `server-node/demo-app` | `@finatic/server-node` | Set `FINATIC_API_URL=https://api-staging.finatic.dev` |
| `server-python/demo-app` | `finatic-server-python` | Set `FINATIC_API_URL=https://api-staging.finatic.dev` |

## Environment Targets

- **Client demo (`client/demo-app`)**: keep environment-specific URL keys and point staging URL values to `https://api-staging.finatic.dev`.
- **Server Node demo (`server-node/demo-app`)**: in `.env`, set `FINATIC_API_URL=https://api-staging.finatic.dev`.
- **Server Python demo (`server-python/demo-app`)**: in `.env`, set `FINATIC_API_URL=https://api-staging.finatic.dev`.

## Quick Start

- `client/demo-app`
- `server-node/demo-app`
- `server-python/demo-app`

## Related Testing App

For broader end-to-end validation flows, use `../testing/FinaticTester`.

## Docs

- SDK docs: [https://finatic.dev/docs](https://finatic.dev/docs)
- API reference: [https://finatic.dev/docs/api-reference](https://finatic.dev/docs/api-reference)
