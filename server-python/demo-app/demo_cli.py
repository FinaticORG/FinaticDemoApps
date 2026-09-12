#!/usr/bin/env python3
"""Finatic Server SDK Python demo.

Flow: API key → session → get_portal_url → grant → list_accounts → webhook catalog.
"""

from __future__ import annotations

import asyncio
import os
import sys

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

try:
    from rich.console import Console
    from rich.prompt import Confirm

    console = Console()
except ImportError:
    print("rich package is required. Install with: uv pip install rich")
    sys.exit(1)

sdk_root_dir = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "..",
        "FinaticServerSDK-Python",
    )
)
if sdk_root_dir not in sys.path:
    sys.path.insert(0, sdk_root_dir)

from finatic_server_python import FinaticServer

API_URL = os.getenv("FINATIC_API_URL", "https://api.finatic.dev")
API_KEY = os.getenv("FINATIC_API_KEY")
FINATIC_ENVIRONMENT = os.getenv("FINATIC_ENVIRONMENT", "sandbox")


async def wait_for_portal_authentication(portal_url: str) -> bool:
    console.print("\n[blue]Visit this Connect URL, grant an account, then return:[/blue]")
    console.print(f"[cyan]{portal_url}[/cyan]")
    confirmed = Confirm.ask(
        "Have you completed Connect and granted an account?", default=False
    )
    if not confirmed:
        console.print("[red]Connect not completed. Exiting...[/red]")
        return False
    return True


async def main() -> None:
    finatic = FinaticServer(
        api_key=API_KEY,
        sdk_config={
            "base_url": API_URL,
            "environment": FINATIC_ENVIRONMENT,
            "log_level": "debug",
            "structured_logging": True,
        },
    )
    session = await finatic.v1.start_session()
    if not session.get("session_id"):
        raise RuntimeError(session.get("error") or "Session start failed")

    session_id = finatic.v1.get_session_id()
    company_account_id = finatic.v1.get_company_id()
    if not session_id or not company_account_id:
        raise RuntimeError(
            "Session initialization did not return session/company context."
        )

    console.print(
        {
            "sessionId": session_id,
            "companyAccountId": company_account_id,
            "environment": FINATIC_ENVIRONMENT,
        }
    )

    portal_url = await finatic.v1.get_portal_url(mode="dark")
    if not portal_url:
        console.print("[red]get_portal_url did not return a URL.[/red]")
        return

    if not (await wait_for_portal_authentication(portal_url)):
        return

    accounts_response = await finatic.v1.list_accounts()
    console.print(accounts_response)

    accounts = accounts_response.get("data") or []
    if accounts:
        first_account = accounts[0]
        account_id = first_account.get("accountId") or first_account.get("id")
        if account_id:
            console.print(await finatic.v1.get_account(account_id))

    console.print(await finatic.v1.get_webhook_catalog())


if __name__ == "__main__":
    asyncio.run(main())
