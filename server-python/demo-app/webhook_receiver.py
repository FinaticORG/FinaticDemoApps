#!/usr/bin/env python3
"""Minimal Finatic webhook signature verifier for Python demos."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request


def verify_finatic_webhook_signature(
    raw_body: bytes,
    signature_header: str | None,
    secret: str,
) -> bool:
    signature = (signature_header or "").removeprefix("sha256=")
    if not signature:
        return False

    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def create_app(secret: str | None = None) -> FastAPI:
    resolved_secret = secret or os.getenv("FINATIC_WEBHOOK_SECRET")
    if not resolved_secret:
        raise RuntimeError("FINATIC_WEBHOOK_SECRET is required for webhook verification.")

    app = FastAPI()

    @app.post("/webhooks/finatic")
    async def receive_finatic_webhook(
        request: Request,
        x_finatic_signature: str | None = Header(default=None),
    ) -> dict[str, Any]:
        raw_body = await request.body()
        if not verify_finatic_webhook_signature(
            raw_body,
            x_finatic_signature,
            resolved_secret,
        ):
            raise HTTPException(status_code=401, detail="invalid_signature")

        event = json.loads(raw_body.decode("utf-8"))
        return {"received": True, "eventId": event.get("id") or event.get("eventId")}

    return app


app = create_app()
