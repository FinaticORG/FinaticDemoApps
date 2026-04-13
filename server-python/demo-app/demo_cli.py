#!/usr/bin/env python3
"""
Finatic Server SDK Python Usage Example

This file demonstrates all public methods of the Finatic Server SDK.
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
    print("❌ Error: rich package is required. Install with: uv pip install rich")
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
        "SDKs",
        "Server",
        "FinaticServerSDK-Python",
    )
)
if sdk_root_dir not in sys.path:
    sys.path.insert(0, sdk_root_dir)

from finatic_server_python import FinaticServer

# Configuration from environment variables
API_URL = os.getenv("FINATIC_API_URL", "https://api.finatic.dev")
API_KEY = os.getenv("FINATIC_API_KEY")


async def wait_for_portal_authentication(portal_url: str) -> bool:
    """Wait for user to authenticate via portal."""
    console.print("\n[blue]🌐 Please visit this URL to authenticate:[/blue]")
    console.print(f"[cyan]{portal_url}[/cyan]")
    confirmed = Confirm.ask("Have you completed authentication in the portal?", default=False)

    if not confirmed:
        console.print("[red]Authentication not completed. Exiting...[/red]")
        return False

    return True


async def main():
    # Initialize SDK
    finatic = await FinaticServer.init(
        api_key=API_KEY,
        sdk_config={
            "base_url": API_URL,
            "log_level": "debug",
            "structured_logging": True,
        },
    )

    # Session methods
    # token = await finatic.get_token()
    # session_result = await finatic.start_session()
    portal_url = await finatic.get_portal_url()

    if not (await wait_for_portal_authentication(portal_url)):
        return

    # session_user = await finatic.get_session_user()

    # Company methods
    # company = await finatic.get_company(company_id="company-id")  # Required: company_id (as kwarg)

    # Broker methods
    # brokers = await finatic.get_brokers()
    # broker_connections = await finatic.get_broker_connections()
    # disconnect_result = await finatic.disconnect_company_from_broker(
    #     connection_id="connection-id"
    # )  # Required: connection_id (as kwarg)

    # Data methods - get_* (single page) - COMMENTED OUT for trading focus
    # accounts = await finatic.get_accounts()
    # orders = await finatic.get_orders()
    # positions = await finatic.get_positions()
    # balances = await finatic.get_balances()
    # transactions = await finatic.get_transactions()
    # if orders.get("success"):
    #     print("We are in orders")
    #     paginated_data = orders["success"]["data"]
    #     print("orders length", len(paginated_data))
    #     print("orders toJSON", paginated_data.to_dict())
    #     if paginated_data.has_more:
    #         print("orders has more")
    #         next_order = await paginated_data.next_page()
    #         last_order = await paginated_data.last_page()
    #         first_order = await paginated_data.first_page()
    # order_fills = await finatic.get_order_fills(
    #     order_id="order-id"
    # )  # Required: order_id, Optional: limit=10, offset=0
    # order_events = await finatic.get_order_events(
    #     order_id="order-id"
    # )  # Required: order_id, Optional: limit=10, offset=0
    # order_groups = await finatic.get_order_groups()
    # position_lots = await finatic.get_position_lots()
    # position_lot_fills = await finatic.get_position_lot_fills(
    #     lot_id="lot-id"
    # )  # Required: lot_id, Optional: limit=10, offset=0

    # Data methods - get_all_* (paginated, fetches all pages) - COMMENTED OUT for trading focus
    # all_accounts = await finatic.get_all_accounts()
    # all_orders = await finatic.get_all_orders()
    # all_positions = await finatic.get_all_positions()
    # all_balances = await finatic.get_all_balances()
    # all_transactions = await finatic.get_all_transactions()
    # all_order_fills = await finatic.get_all_order_fills(order_id="order-id")  # Required: order_id
    # all_order_events = await finatic.get_all_order_events(order_id="order-id")  # Required: order_id
    # all_order_groups = await finatic.get_all_order_groups()
    # all_position_lots = await finatic.get_all_position_lots()
    # all_position_lot_fills = await finatic.get_all_position_lot_fills(
    #     lot_id="lot-id"
    # )  # Required: lot_id

    # Trading methods - ACTIVE for testing
    # Place order / modify order use top-level params: broker, account_number?, order (no body wrapper)
    test_account_number = 123456789  # Replace with your account number
    test_broker = "robinhood"  # Replace with your broker

    place_order_result = await finatic.place_order(
        broker=test_broker,  # Required: broker identifier
        account_number=test_account_number,  # Optional: account number at top level
        order={
            "order_type": "market",
            "asset_type": "equity",
            "action": "buy",
            "time_in_force": "day",
            "symbol": "AAPL",
            "order_qty": 1,
        },
        # connection_id is optional and removed from SDK interface
    )
    print("place_order_result", place_order_result)

    # modify_order_result = await finatic.modify_order(
    #     order_id=all_orders["success"]["data"][0]["order_id"],
    #     broker="robinhood",  # Required: broker identifier
    #     account_number=all_accounts["success"]["data"][0].get("account_number") or all_accounts["success"]["data"][0]["account_id"],  # Required: account number at top level
    #     order={
    #         "order_type": "market",
    #         "asset_type": "equity",
    #         "action": "buy",
    #         "time_in_force": "day",
    #         "symbol": "AAPL",
    #         "order_qty": 2,
    #     },
    # )
    # print("modify_order_result", modify_order_result)

    # cancel_order_result = await finatic.cancel_order(
    #     order_id=all_orders["success"]["data"][0]["order_id"],
    # )
    # print("cancel_order_result", cancel_order_result)


if __name__ == "__main__":
    asyncio.run(main())
