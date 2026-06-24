import type { FinaticConnect } from "@finatic/client";

export type FinaticV1Response<T = unknown> = {
  trace_id?: string;
  success?: {
    data?: T;
    meta?: Record<string, unknown> | null;
  } | null;
  error?: Record<string, unknown> | null;
  warning?: unknown;
};

type AccountScopedOrderCommandParams = {
  accountId: string;
  orderId: string;
  body?: unknown;
  idempotencyKey: string;
};

type FinaticV1Client = FinaticConnect & {
  v1: {
    listAccounts: (
      params?: { limit?: number; offset?: number; includeSyncStatus?: boolean },
    ) => Promise<FinaticV1Response<unknown[]>>;
    listPortalInstitutions: (sessionId: string) => Promise<FinaticV1Response<unknown[]>>;
    listAccountGrants: () => Promise<FinaticV1Response<unknown[]>>;
    revokeAccountGrant: (grantId: string) => Promise<FinaticV1Response<unknown>>;
    createAccountOrder: (params: {
      accountId: string;
      body?: unknown;
      idempotencyKey: string;
    }) => Promise<FinaticV1Response<unknown>>;
    cancelAccountOrder: (
      params: AccountScopedOrderCommandParams,
    ) => Promise<FinaticV1Response<unknown>>;
    modifyAccountOrder: (
      params: AccountScopedOrderCommandParams,
    ) => Promise<FinaticV1Response<unknown>>;
  };
};

export function getFinaticV1Client(finatic: FinaticConnect): FinaticV1Client["v1"] {
  const clientWithV1 = finatic as FinaticV1Client;
  if (!clientWithV1.v1) {
    throw new Error(
      "Finatic Client SDK v1 facade is not available — install @finatic/client ^1.0.0",
    );
  }
  return clientWithV1.v1;
}
