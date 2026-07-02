# demoapps Architecture and Runtime

## Repository Role

`demoapps` contains runnable examples that demonstrate expected integration patterns across client and server SDKs.

## Structure

- `client/` - browser/client-side examples
- `server-node/` - Node server examples
- `server-python/` - Python server examples

## Runtime Flow (High Level)

1. A server-side demo obtains/uses credentials and session context.
2. Client-side demo flows open Connect and grant financial accounts via v1 portal links.
3. Demo requests execute broker-domain read/operation methods.
4. Output verifies expected response structure and integration behavior.

## Operational Boundaries

- This repository is for integration examples, not production service ownership.
- Core business/runtime authority remains in API/background/database repositories.
