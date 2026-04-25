# Finatic Server SDK Node Demo

Node.js demo for `@finatic/server-node`.

## Setup

```bash
npm install
cp env.example .env
```

Set your API key in `.env`.

## Staging Override

Use staging by setting:

```bash
FINATIC_API_URL=https://api-staging.finatic.dev
```

## Run

```bash
npm run dev
```

API mode:

```bash
npm run api:dev
```

## Related Testing App

For integrated testing flows, see `../../../testing/FinaticTester`.
