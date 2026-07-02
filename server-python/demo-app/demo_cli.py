#!/usr/bin/env python3
"""Finatic Server SDK Python Usage Example

This file demonstrates the FDX v1 account-first flow:
session -> portal link -> account read -> webhook catalog.
"""

import asyncio
import os

# Load environment variables from .env file
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
    print(
        "❌ Error: rich package is required. Install with: uv pip install rich"
    )
    import sys

    sys.exit(1)

# Add SDK root directory to path to import SDK
import sys

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

# Configuration from environment variables
API_URL = os.getenv("FINATIC_API_URL", "https://api.finatic.dev")
API_KEY = os.getenv("FINATIC_API_KEY")
FINATIC_ENVIRONMENT = os.getenv("FINATIC_ENVIRONMENT", "sandbox")
CONNECT_URL = os.getenv(
    "FINATIC_CONNECT_URL", "https://connect.finatic.dev"
).rstrip("/")


def get_portal_url(portal_link: dict) -> str | None:
    portal_data = portal_link.get("success", {}).get(
        "data", {}
    ) or portal_link.get("data", {})
    portal_url = portal_data.get("portalUrl") or portal_data.get("portal_url")
    if portal_url:
        return portal_url

    token = portal_data.get("one_time_token")
    if not token:
        return None

    from urllib.parse import urlencode

    return f"{CONNECT_URL}/auth?{urlencode({'token': token})}"


async def wait_for_portal_authentication(portal_url: str) -> bool:
    """Wait for user to authenticate via portal."""
    console.print("\n[blue]🌐 Please visit this URL to authenticate:[/blue]")
    console.print(f"[cyan]{portal_url}[/cyan]")
    confirmed = Confirm.ask(
        "Have you completed authentication in the portal?", default=False
    )

    if not confirmed:
        console.print("[red]Authentication not completed. Exiting...[/red]")
        return False

    return True


async def main():
    finatic = await FinaticServer.init(
        api_key=API_KEY,
        sdk_config={
            "base_url": API_URL,
            "environment": FINATIC_ENVIRONMENT,
            "log_level": "debug",
            "structured_logging": True,
        },
    )

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

    portal_link = await finatic.v1.create_portal_link(session_id)
    portal_url = get_portal_url(portal_link)
    if not portal_url:
        console.print("[red]Portal link response did not include a URL.[/red]")
        console.print(portal_link)
        return

    if not (await wait_for_portal_authentication(portal_url)):
        return

    accounts_response = await finatic.v1.list_accounts()
    console.print(accounts_response)

    accounts = accounts_response.get("success", {}).get(
        "data", []
    ) or accounts_response.get("data", [])
    if accounts:
        first_account = accounts[0]
        account_id = first_account.get("accountId") or first_account.get("id")
        if account_id:
            console.print(await finatic.v1.get_account(account_id))

    if hasattr(finatic.v1, "get_webhook_catalog"):
        console.print(await finatic.v1.get_webhook_catalog())


if __name__ == "__main__":
    asyncio.run(main())
