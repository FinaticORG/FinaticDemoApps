import type { FinaticConnect } from "@finatic/client";
import { getFinaticV1Client } from "@/lib/v1-client";

type V1ListResponse<T> = {
  success?: { data?: T[] | null } | null;
};

export async function listAllV1Accounts(finatic: FinaticConnect) {
  const aggregatedRows: unknown[] = [];
  let offset = 0;
  const limit = 100;

  for (let pageIndex = 0; pageIndex < 25; pageIndex += 1) {
    const response = (await getFinaticV1Client(finatic).listAccounts({
      offset,
      limit,
      includeSyncStatus: true,
    })) as V1ListResponse<unknown>;
    const pageRows = response.success?.data ?? [];
    if (!Array.isArray(pageRows) || pageRows.length === 0) {
      break;
    }
    aggregatedRows.push(...pageRows);
    if (pageRows.length < limit) {
      break;
    }
    offset += limit;
  }

  return aggregatedRows;
}

export function isActiveAccountRow(accountRow: Record<string, unknown>): boolean {
  const status = String(accountRow.accountStatus ?? accountRow.status ?? "").toUpperCase();
  return status === "ACTIVE" || accountRow.active === true;
}

export function deriveBrokersFromAccountRows(accountRows: Array<Record<string, unknown>>) {
  const brokersById = new Map<string, { id: string; display_name: string; name: string }>();

  for (const accountRow of accountRows) {
    const brokerId = String(accountRow.brokerId ?? accountRow.broker_id ?? "").trim();
    if (!brokerId) {
      continue;
    }
    const normalizedBrokerId = brokerId.toLowerCase();
    if (brokersById.has(normalizedBrokerId)) {
      continue;
    }
    const displayName = String(
      accountRow.brokerName ?? accountRow.broker_name ?? brokerId,
    ).trim();
    brokersById.set(normalizedBrokerId, {
      id: brokerId,
      display_name: displayName,
      name: displayName,
    });
  }

  return Array.from(brokersById.values());
}

export function readFinaticAccountId(accountRow: Record<string, unknown>): string {
  return String(accountRow.id ?? "").trim();
}

export function readBrokerAccountNumber(accountRow: Record<string, unknown>): string {
  return String(
    accountRow.accountNumber ??
      accountRow.account_number ??
      accountRow.accountId ??
      accountRow.account_id ??
      "",
  ).trim();
}
