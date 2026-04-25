# Finatic Client Demo App

Next.js demo app for testing `@finatic/client` flows.

## Run

```bash
npm install
npm run dev
```

## Staging Environment Override

Set staging URL values to:

```bash
FINATIC_STAGING_API_URL=https://api-staging.finatic.dev
NEXT_PUBLIC_FINATIC_STAGING_API_URL=https://api-staging.finatic.dev
```

Use your staging API keys in this app's environment configuration before running.

## Related Testing App

For end-to-end testing scenarios, see `../../../testing/FinaticTester`.
