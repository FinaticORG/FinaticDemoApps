/**
 * Finatic SDK Singleton
 * 
 * This file demonstrates how to initialize and use the Finatic Client SDK.
 * In production, the token should be fetched from your backend server, not directly
 * from the frontend. This is shown here for simplicity in the demo.
 */

import { FinaticConnect } from '@finatic/client';

// API base URL from environment variable, defaulting to production
const API_BASE_URL = (import.meta as any).env?.VITE_FINATIC_API_URL || 'https://api.finatic.dev';
const FINATIC_ENVIRONMENT = (import.meta as any).env?.VITE_FINATIC_ENVIRONMENT || 'sandbox';

// Singleton instance
let finaticInstance: FinaticConnect | null = null;

type PortalCallbacks = {
  onSuccess?: (userId: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
};

function getConnectUrl(): string {
  return (
    (import.meta as any).env?.VITE_FINATIC_CONNECT_URL ||
    (FINATIC_ENVIRONMENT === 'sandbox'
      ? 'https://connect.finatic.dev'
      : 'https://connect.finatic.dev')
  ).replace(/\/$/, '');
}

function showPortalFrame(portalUrl: string, sessionId: string, options: PortalCallbacks = {}): void {
  const container = document.createElement('div');
  container.style.cssText = [
    'position: fixed',
    'inset: 0',
    'background: rgba(0, 0, 0, 0.5)',
    'z-index: 9999',
  ].join(';');

  const iframe = document.createElement('iframe');
  iframe.src = portalUrl;
  iframe.style.cssText = [
    'position: absolute',
    'top: 50%',
    'left: 50%',
    'transform: translate(-50%, -50%)',
    'width: 90%',
    'max-width: 500px',
    'height: 90%',
    'max-height: 600px',
    'border: none',
    'border-radius: 24px',
    'background: white',
  ].join(';');
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-same-origin');
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

  const originalBodyStyle = document.body.style.cssText;
  const scrollY = window.scrollY;
  let portalOrigin: string | null = null;
  try {
    portalOrigin = new URL(portalUrl).origin;
  } catch {
    portalOrigin = null;
  }

  function cleanup(): void {
    window.removeEventListener('message', handleMessage);
    container.remove();
    document.body.style.cssText = originalBodyStyle;
    window.scrollTo(0, scrollY);
  }

  function handleMessage(event: MessageEvent): void {
    if (portalOrigin && event.origin !== portalOrigin) return;
    if (!event.data || typeof event.data !== 'object' || !event.data.type) return;

    const { type, userId, error, data } = event.data;
    if (type === 'portal-success') {
      options.onSuccess?.(userId || data?.userId || sessionId);
    } else if (type === 'portal-error') {
      options.onError?.(new Error(error || data?.message || 'Unknown portal error'));
    } else if (type === 'portal-close') {
      options.onClose?.();
      cleanup();
    }
  }

  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.top = `-${scrollY}px`;
  container.appendChild(iframe);
  document.body.appendChild(container);
  window.addEventListener('message', handleMessage);
}

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
 * NOTE: In production, you should fetch the token from your backend server,
 * not directly from the Finatic API. This prevents exposing your API key
 * in the frontend code.
 * 
 * @returns Promise<FinaticConnect> - The initialized SDK instance
 */
export async function initializeSDK(): Promise<FinaticConnect> {
  if (finaticInstance) {
    return finaticInstance;
  }

  // Get API key from environment variables
  const apiKey = (import.meta as any).env?.VITE_FINATIC_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_FINATIC_API_KEY environment variable is required');
  }

  // ⚠️ PRODUCTION NOTE: In production, this token fetch should be done on your backend server.
  // Your frontend should call YOUR backend API endpoint (e.g., /api/finatic/token),
  // which then securely calls the Finatic API with your API key.
  // This prevents exposing your API key in the frontend bundle.
  
  const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'X-Finatic-Environment': FINATIC_ENVIRONMENT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      environment: FINATIC_ENVIRONMENT,
      metadata: {
        demo: 'client/simple-demo-app',
      },
    }),
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
  return finaticInstance.isAuthed();
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
  return finaticInstance.getUserId() || null;
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
  theme?: string | { preset?: string; custom?: Record<string, unknown> };
  brokers?: string[];
  email?: string;
  mode?: 'light' | 'dark';
}): Promise<void> {
  if (!finaticInstance) {
    throw new Error('SDK not initialized. Call initializeSDK() first.');
  }

  // Wrap onSuccess to store user ID in localStorage
  const wrappedOnSuccess = options?.onSuccess 
    ? (userId: string) => {
        // Store user ID in localStorage
        // ⚠️ PRODUCTION NOTE: In production, store this in your database linked to your user account
        storeUserId(userId);
        
        // Call original callback
        options.onSuccess!(userId);
      }
    : (userId: string) => {
        // Store user ID even if no callback provided
        storeUserId(userId);
      };

  const apiKey = (import.meta as any).env?.VITE_FINATIC_API_KEY;
  const sessionId = finaticInstance.getSessionId?.() ?? (finaticInstance as any).sessionId;

  if (!apiKey) {
    throw new Error('VITE_FINATIC_API_KEY environment variable is required');
  }
  if (!sessionId) {
    throw new Error('Session not initialized. Reinitialize the SDK before opening Connect.');
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/sessions/${encodeURIComponent(sessionId)}/portal-links`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'X-Finatic-Environment': FINATIC_ENVIRONMENT,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create v1 portal link: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const token = data.success?.data?.one_time_token ?? data.data?.one_time_token;
  if (!token) {
    throw new Error('No portal token found in API response');
  }

  const portalUrl = new URL('/auth', getConnectUrl());
  portalUrl.searchParams.set('token', token);
  if (typeof options?.theme === 'string') {
    portalUrl.searchParams.set('theme', options.theme);
  } else if (options?.theme?.preset) {
    portalUrl.searchParams.set('theme', options.theme.preset);
  }
  options?.brokers?.forEach((broker) => portalUrl.searchParams.append('brokers', broker));
  if (options?.email) portalUrl.searchParams.set('email', options.email);
  if (options?.mode) portalUrl.searchParams.set('mode', options.mode);

  showPortalFrame(portalUrl.toString(), sessionId, {
    onSuccess: wrappedOnSuccess,
    onError: options?.onError,
    onClose: options?.onClose,
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
