/**
 * Finatic SDK Singleton
 *
 * The company API key stays on the Vite dev server (`FINATIC_API_KEY`).
 * The browser only calls `/api/finatic/token` and receives a 90-second one-time token.
 */

import { FinaticConnect } from '@finatic/client';

const API_BASE_URL = (import.meta as any).env?.VITE_FINATIC_API_URL || 'https://api.finatic.dev';
const FINATIC_ENVIRONMENT = (import.meta as any).env?.VITE_FINATIC_ENVIRONMENT || 'sandbox';

let finaticInstance: FinaticConnect | null = null;

/**

 * Get stored user ID from localStorage
 * 
 * @returns string | null - The stored user ID, or null if not found
 */
function getStoredUserId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem('finatic_user_id');
  } catch {
    return null;
  }
}

/**
 * Store user ID in localStorage
 * 
 * ⚠️ PRODUCTION NOTE: In production, you should store the user ID in your database
 * linked to your user account, not in localStorage. This ensures the user ID persists
 * across devices and browsers, and is more secure.
 * 
 * @param userId - The user ID to store
 */
function storeUserId(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem('finatic_user_id', userId);
  } catch {
    // Ignore localStorage errors (e.g., in private browsing mode)
  }
}

/**
 * Initialize the Finatic SDK
 *
 * The company API key never enters this bundle. The Vite dev server mints a
 * one-time token at `/api/finatic/token` using `FINATIC_API_KEY`.
 *
 * @returns Promise<FinaticConnect> - The initialized SDK instance
 */
export async function initializeSDK(): Promise<FinaticConnect> {
  if (finaticInstance) {
    return finaticInstance;
  }

  const response = await fetch('/api/finatic/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const token = data.success?.data?.one_time_token ?? data.data?.one_time_token;

  if (!token) {
    throw new Error('No token found in API response');
  }

  // Get stored user ID from localStorage (if available)
  const storedUserId = getStoredUserId();

  // Initialize the SDK with token and user ID (if available)
  // Since userId is optional, we can pass it directly - undefined/null will be treated as not provided
  finaticInstance = await FinaticConnect.init(token, storedUserId ?? undefined,
    {
      baseUrl: API_BASE_URL,
      apiEnvironment: FINATIC_ENVIRONMENT,
    }
  );

  return finaticInstance;
}

/**
 * Get the current Finatic SDK instance
 * 
 * @returns FinaticConnect | null - The SDK instance, or null if not initialized
 */
export function getSDK(): FinaticConnect | null {
  return finaticInstance;
}

/**
 * Check if the SDK is initialized
 * 
 * @returns boolean - True if SDK is initialized
 */
export function isSDKInitialized(): boolean {
  return finaticInstance !== null;
}

/**
 * Check if the user is authenticated
 * 
 * @returns boolean - True if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (!finaticInstance) {
    return false;
  }
  return finaticInstance.v1.isAuthed();
}

/**
 * Get the current user ID
 * 
 * @returns string | null - The user ID, or null if not authenticated
 */
export function getUserId(): string | null {
  if (!finaticInstance) {
    return null;
  }
  return finaticInstance.v1.getUserId() || null;
}

/**
 * Open the authentication portal
 * 
 * @param options - Portal options including callbacks
 * @param options.onSuccess - Callback when authentication succeeds
 * @param options.onError - Callback when authentication fails
 * @param options.onClose - Callback when portal is closed
 * @param options.theme - Optional theme configuration
 * @param options.brokers - Optional array of broker IDs to filter
 * @param options.email - Optional email address for pre-filling
 * @param options.mode - Optional mode ('light' | 'dark')
 */
export async function openPortal(options?: {
  onSuccess?: (userId: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onEvent?: (eventName: string, payload?: unknown) => void;
  theme?: string | { preset?: string; custom?: Record<string, unknown> };
  brokers?: string[];
  email?: string;
  mode?: 'light' | 'dark';
}): Promise<void> {
  if (!finaticInstance) {
    throw new Error('SDK not initialized. Call initializeSDK() first.');
  }

  const wrappedOnSuccess = (userId: string) => {
    storeUserId(userId);
    options?.onSuccess?.(userId);
  };

  await finaticInstance.openPortal({
    theme: options?.theme,
    brokers: options?.brokers,
    email: options?.email,
    mode: options?.mode,
    onSuccess: wrappedOnSuccess,
    onError: options?.onError,
    onClose: options?.onClose,
    onEvent: options?.onEvent,
  });
}

export async function listAccounts(): Promise<any> {
  if (!finaticInstance) {
    throw new Error('SDK not initialized. Call initializeSDK() first.');
  }

  return finaticInstance.v1.listAccounts({ includeSyncStatus: true }, {
    environment: FINATIC_ENVIRONMENT,
  });
}

export async function getAccount(accountId: string): Promise<any> {
  if (!finaticInstance) {
    throw new Error('SDK not initialized. Call initializeSDK() first.');
  }

  return finaticInstance.v1.getAccount(accountId, {
    environment: FINATIC_ENVIRONMENT,
  });
}
