# Finatic Python Server SDK Demo

Python demo for `finatic-server-python`.

## Setup

```bash
uv sync
cp env.example .env
```

Set your API key in `.env`.

## Staging Override

Use staging by setting:

```bash
FINATIC_API_URL=https://api-staging.finatic.dev
```

## Run

CLI demo:

```bash
uv run python demo_cli.py
```

Webhook receiver sample:

```bash
FINATIC_WEBHOOK_SECRET=replace-with-webhook-secret uv run uvicorn webhook_receiver:app --host 0.0.0.0 --port 8080
```

## Related Testing App

For integrated testing flows, see `../../../testing/FinaticTester`.
