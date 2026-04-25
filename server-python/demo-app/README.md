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
uv run python test_trading.py
```

API mode:

```bash
uv run python run_api.py
```

## Related Testing App

For integrated testing flows, see `../../../testing/FinaticTester`.
