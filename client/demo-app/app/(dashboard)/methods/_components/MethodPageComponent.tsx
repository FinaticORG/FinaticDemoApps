"use client";

import { useMemo } from "react";

import {
  MethodHarness,
  type MethodDefinition,
  type MethodGroup,
} from "@/app/(dashboard)/methods/_components/MethodHarness";

function parseNumberField(
  values: Record<string, string> | undefined,
  key: string,
  fallback: number,
  label: string,
) {
  const raw = values?.[key];
  if (raw == null || raw === "") {
    return fallback;
  }
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number for ${label}`);
  }
  return parsed;
}

function parseOptionalJson(raw?: string, label?: string) {
  if (!raw || !raw.trim()) return undefined;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON${label ? ` for ${label}` : ""}`);
  }
}

function parseV1Query(raw?: string, label = "query JSON") {
  const parsed = parseOptionalJson(raw, label);
  if (parsed == null) return {};
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  const query = { ...(parsed as Record<string, unknown>) };
  if ("connectionId" in query) {
    throw new Error("Use financial accountId for v1 resources; connectionId is internal only.");
  }
  return query;
}

function prepareAccountScopedArgs(fieldValues: Record<string, string> | undefined) {
  const accountId = fieldValues?.accountId?.trim();
  if (!accountId) {
    throw new Error("Enter a financial accountId.");
  }
  return [{ ...parseV1Query(fieldValues?.filter, "query JSON"), accountId }];
}

export function MethodPageComponent() {
  const methodGroups = useMemo<MethodGroup[]>(() => {
    const groups: MethodGroup[] = [];

    const sessionMethods: MethodDefinition[] = [
      {
        key: "getUserId",
        label: "Get user id",
        description: "Returns the current user id from the SDK session.",
        input: { type: "none" },
      },
      {
        key: "getSessionId",
        label: "Get session id",
        description: "Returns the current session ID from the SDK session.",
        input: { type: "none" },
      },
      {
        key: "getCompanyId",
        label: "Get company id",
        description: "Returns the current company ID from the SDK session.",
        input: { type: "none" },
      },
      {
        key: "isAuthed",
        label: "Is authenticated?",
        description: "Returns true when the SDK has an authenticated session.",
        input: { type: "none" },
        methodName: "isAuthenticated",
      },
      {
        key: "openPortal",
        label: "Open broker portal",
        description:
          "Opens the hosted onboarding portal in a modal or new tab.",
        input: {
          type: "json",
          defaultValue: JSON.stringify(
            {
              path: "/",
              mode: "modal",
            },
            null,
            2,
          ),
          placeholder: '{\n  "path": "/",\n  "mode": "modal"\n}',
        },
        prepareArgs: ({ inputValue }) => {
          const payload = parseOptionalJson(inputValue, "portal options");
          return payload ? [payload] : [];
        },
      },
      {
        key: "getPortalUrl",
        label: "Get portal URL",
        description:
          "Returns the portal URL for authentication (server SDKs use this, client SDKs typically use openPortal).",
        input: {
          type: "json",
          defaultValue: JSON.stringify(
            {
              path: "/",
              mode: "modal",
            },
            null,
            2,
          ),
          placeholder: '{\n  "path": "/",\n  "mode": "modal"\n}',
        },
        prepareArgs: ({ inputValue }) => {
          const payload = parseOptionalJson(inputValue, "portal options");
          return payload ? [payload] : [];
        },
      },
      {
        key: "closePortal",
        label: "Close portal",
        description: "Closes the hosted onboarding portal.",
        input: { type: "none" },
      },
      {
        key: "disconnectCompany",
        label: "Disconnect company",
        description: "Calls the revoke endpoint for a connection id.",
        methodName: "disconnectCompanyFromBroker",
        input: {
          type: "fields",
          fields: [
            {
              name: "connectionId",
              label: "Connection id",
              placeholder: "connection-uuid",
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => {
          const value = fieldValues?.connectionId?.trim();
          if (!value) {
            throw new Error("Enter a connection id to disconnect.");
          }
          return [{ connectionId: value }];
        },
      },
      {
        key: "getCompany",
        label: "Get company",
        description: "Get public company details by ID.",
        input: {
          type: "fields",
          fields: [
            {
              name: "companyId",
              label: "Company id",
              placeholder: "company-uuid",
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => {
          const value = fieldValues?.companyId?.trim();
          if (!value) {
            throw new Error("Enter a company id.");
          }
          return [{ companyId: value }];
        },
      },
    ];

    groups.push({
      key: "session",
      title: "Session & Portal",
      description: "Manage authentication context and hosted portal lifecycle.",
      methods: sessionMethods,
    });

    const directoryMethods: MethodDefinition[] = [
      {
        key: "getBrokerList",
        label: "Get broker directory",
        description:
          "Loads the supported broker catalogue (with CDN logo paths).",
        input: { type: "none" },
      },
      {
        key: "getBrokerConnections",
        label: "Get broker connections",
        description:
          "Retrieves active broker connections for the authenticated user.",
        input: { type: "none" },
      },
    ];

    groups.push({
      key: "directory",
      title: "Broker directory",
      description: "Inspect broker metadata and existing user connections.",
      methods: directoryMethods,
    });

    const accountMethods: MethodDefinition[] = [
      {
        key: "getAccounts",
        label: "Get accounts",
        description:
          "Retrieves paginated account-first v1 accounts.",
        input: {
          type: "fields",
          fields: [
            {
              name: "filter",
              label: "Query JSON",
              placeholder: '{"includeSyncStatus":true,"limit":50,"offset":0}',
              description: "Optional v1 listAccounts query JSON.",
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => {
          return [parseV1Query(fieldValues?.filter, "query JSON")];
        },
      },
      {
        key: "getAllAccounts",
        label: "Get all accounts",
        description:
          "Runs the v1 account list helper; use limit/offset for pagination.",
        input: {
          type: "fields",
          fields: [
            {
              name: "filter",
              label: "Query JSON",
              placeholder: '{"includeSyncStatus":true,"limit":100}',
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => {
          return [parseV1Query(fieldValues?.filter, "query JSON")];
        },
      },
    ];

    groups.push({
      key: "accounts",
      title: "Account data",
      description:
        "Query accounts using filters, pagination, and aggregations.",
      methods: accountMethods,
    });

    const balanceMethods: MethodDefinition[] = [
      {
        key: "getBalances",
        label: "Get balances",
        description:
          "High-level convenience helper that proxies to the balances endpoint.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
              description: "Required v1 financial account id.",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: '{"currency":"USD","limit":50,"offset":0}',
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => prepareAccountScopedArgs(fieldValues),
      },
      {
        key: "getAllBalances",
        label: "Get all balances",
        description: "Runs the account-scoped v1 balances helper.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: '{"currency":"USD","limit":100}',
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => prepareAccountScopedArgs(fieldValues),
      },
    ];

    groups.push({
      key: "balances",
      title: "Balance data",
      description: "Validate cash, margin, and buying power endpoints.",
      methods: balanceMethods,
    });

    const transactionMethods: MethodDefinition[] = [
      {
        key: "getTransactions",
        label: "Get transactions",
        description:
          "Retrieves paginated transactions (deposits, withdrawals, dividends, transfers, etc.).",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
              description: "Required v1 financial account id.",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder:
                '{"transactionType":"DIVIDEND","startDate":"","endDate":"","limit":50,"offset":0}',
              description:
                "Optional account-scoped v1 transaction query JSON.",
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => prepareAccountScopedArgs(fieldValues),
      },
      {
        key: "getAllTransactions",
        label: "Get all transactions",
        description: "Runs the account-scoped v1 transaction helper.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: '{"limit":100,"offset":0}',
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => prepareAccountScopedArgs(fieldValues),
      },
    ];

    groups.push({
      key: "transactions",
      title: "Transaction data",
      description:
        "Cash movements and other non-order activity from broker connections.",
      methods: transactionMethods,
    });

    const orderMethods: MethodDefinition[] = [
      {
        key: "getOrders",
        label: "Get orders",
        description:
          "Retrieves account-scoped v1 orders.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
              description: "Required v1 financial account id.",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: '{"status":"filled","limit":50,"offset":0}',
              description: "Optional account-scoped v1 order query JSON.",
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => prepareAccountScopedArgs(fieldValues),
      },
      {
        key: "getAllOrders",
        label: "Get all orders",
        description: "Runs the account-scoped v1 orders helper.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: '{"status":"pending","limit":100}',
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => prepareAccountScopedArgs(fieldValues),
      },
      {
        key: "getOrderFills",
        label: "Get order fills",
        description: "Retrieves fills for a specific order by order ID.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
              description: "Required v1 financial account id.",
            },
            {
              name: "orderId",
              label: "Order ID",
              placeholder: "order-uuid",
              description: "Required order ID.",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: "{}",
              description: "Optional account-scoped v1 query JSON.",
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => {
          const accountId = fieldValues?.accountId?.trim();
          if (!accountId) {
            throw new Error("Enter a financial accountId.");
          }
          const orderId = fieldValues?.orderId?.trim();
          if (!orderId) {
            throw new Error("Enter an order ID.");
          }
          return [{ ...parseV1Query(fieldValues?.filter, "query JSON"), accountId, orderId }];
        },
      },
      {
        key: "getOrderEvents",
        label: "Get order events",
        description: "Retrieves events for a specific order by order ID.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
              description: "Required v1 financial account id.",
            },
            {
              name: "orderId",
              label: "Order ID",
              placeholder: "order-uuid",
              description: "Required order ID.",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: "{}",
              description: "Optional account-scoped v1 query JSON.",
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => {
          const accountId = fieldValues?.accountId?.trim();
          if (!accountId) {
            throw new Error("Enter a financial accountId.");
          }
          const orderId = fieldValues?.orderId?.trim();
          if (!orderId) {
            throw new Error("Enter an order ID.");
          }
          return [{ ...parseV1Query(fieldValues?.filter, "query JSON"), accountId, orderId }];
        },
      },
    ];

    groups.push({
      key: "orders",
      title: "Order data",
      description: "Validate historical and open account-scoped v1 orders.",
      methods: orderMethods,
    });

    const positionMethods: MethodDefinition[] = [
      {
        key: "getPositions",
        label: "Get positions",
        description:
          "Retrieves account-scoped v1 positions.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
              description: "Required v1 financial account id.",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: '{"position_status":"open","limit":50,"offset":0}',
              description: "Optional account-scoped v1 position query JSON.",
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => prepareAccountScopedArgs(fieldValues),
      },
      {
        key: "getAllPositions",
        label: "Get all positions",
        description: "Runs the account-scoped v1 positions helper.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: '{"position_status":"open","limit":100}',
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => prepareAccountScopedArgs(fieldValues),
      },
      {
        key: "getPositionLots",
        label: "Get position lots",
        description:
          "Retrieves account-scoped v1 position lots.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
              description: "Required v1 financial account id.",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: '{"limit":50,"offset":0}',
              description: "Optional account-scoped v1 position-lots query JSON.",
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => prepareAccountScopedArgs(fieldValues),
      },
      {
        key: "getAllPositionLots",
        label: "Get all position lots",
        description: "Runs the account-scoped v1 position-lots helper.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: '{"limit":100}',
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => prepareAccountScopedArgs(fieldValues),
      },
      {
        key: "getPositionLotFills",
        label: "Get position lot fills",
        description: "Retrieves fills for a specific position lot by lot ID.",
        input: {
          type: "fields",
          fields: [
            {
              name: "accountId",
              label: "Financial accountId",
              placeholder: "acct_...",
              description: "Required v1 financial account id.",
            },
            {
              name: "lotId",
              label: "Lot ID",
              placeholder: "lot-uuid",
              description: "Required position lot ID.",
            },
            {
              name: "filter",
              label: "Query JSON",
              placeholder: "{}",
              description: "Optional account-scoped v1 query JSON.",
            },
          ],
        },
        prepareArgs: ({ fieldValues }) => {
          const accountId = fieldValues?.accountId?.trim();
          if (!accountId) {
            throw new Error("Enter a financial accountId.");
          }
          const lotId = fieldValues?.lotId?.trim();
          if (!lotId) {
            throw new Error("Enter a lot ID.");
          }
          return [{ ...parseV1Query(fieldValues?.filter, "query JSON"), accountId, lotId }];
        },
      },
    ];

    groups.push({
      key: "positions",
      title: "Position data",
      description: "Inspect account-scoped v1 positions and position lots.",
      methods: positionMethods,
    });

    return groups;
  }, []);

  return (
    <MethodHarness
      title="Finatic SDK Method lab"
      description="Interactive playground covering every broker data method exposed by the Finatic SDK."
      methodGroups={methodGroups}
    />
  );
}
