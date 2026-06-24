/**
 * Canonical FDX v1 provider matrix for demo UI broker pickers.
 */
import providerMatrixData from "./provider_matrix_data.json";

export type FdxProviderMatrixEntry = {
  providerId: string;
  displayName: string;
};

type ProviderMatrixJsonRow = {
  provider_id: string;
  display_name: string;
};

export const FDX_V1_PROVIDER_MATRIX: readonly FdxProviderMatrixEntry[] = (
  providerMatrixData.providers as ProviderMatrixJsonRow[]
).map((row) => ({
  providerId: row.provider_id,
  displayName: row.display_name,
}));

export function toPortalBrokerInfo(entry: FdxProviderMatrixEntry) {
  return {
    id: entry.providerId,
    name: entry.displayName,
    display_name: entry.displayName,
    supports_trading: true,
    is_alias: false,
  };
}
