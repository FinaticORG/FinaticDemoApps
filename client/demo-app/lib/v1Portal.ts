'use client';

import type { EnvironmentMode, EnvironmentType } from '@/lib/utils';

type PortalCallbacks = {
  onSuccess?: (userId: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onEvent?: (type: string, data: unknown) => void;
};

type PortalLinkOptions = {
  theme?: string | { preset?: string; custom?: Record<string, unknown> };
  brokers?: string[];
  kind?: string;
  asset_types?: string[];
  stage?: string[];
  email?: string;
  mode?: 'light' | 'dark';
};

function appendPortalOptions(portalUrl: string, options: PortalLinkOptions) {
  const url = new URL(portalUrl);
  if (options.theme) {
    if (typeof options.theme === 'string') {
      url.searchParams.set('theme', options.theme);
    } else if (options.theme.preset) {
      url.searchParams.set('theme', options.theme.preset);
    }
  }
  options.brokers?.forEach((broker) => url.searchParams.append('brokers', broker));
  if (options.kind) url.searchParams.set('kind', options.kind);
  options.asset_types?.forEach((assetType) => url.searchParams.append('asset_types', assetType));
  options.stage?.forEach((stage) => url.searchParams.append('stage', stage));
  if (options.email) url.searchParams.set('email', options.email);
  if (options.mode) url.searchParams.set('mode', options.mode);
  return url.toString();
}

type SessionBearingClient = {
  getSessionId?: () => string | undefined;
};

function getSessionId(finatic: SessionBearingClient) {
  return finatic.getSessionId?.() ?? (finatic as { sessionId?: string }).sessionId;
}

function showPortalFrame(portalUrl: string, sessionId: string, callbacks: PortalCallbacks = {}) {
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
  } catch {}

  function cleanup() {
    window.removeEventListener('message', handleMessage);
    container.remove();
    document.body.style.cssText = originalBodyStyle;
    window.scrollTo(0, scrollY);
  }

  function handleMessage(event: MessageEvent) {
    if (portalOrigin && event.origin !== portalOrigin) return;
    if (!event.data || typeof event.data !== 'object' || !event.data.type) return;

    const { type, userId, error, data } = event.data;
    callbacks.onEvent?.(type, data ?? event.data);
    if (type === 'portal-success') {
      callbacks.onSuccess?.(userId || data?.userId || sessionId);
    } else if (type === 'portal-error') {
      callbacks.onError?.(new Error(error || data?.message || 'Unknown portal error'));
    } else if (type === 'portal-close') {
      callbacks.onClose?.();
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

export async function openV1Portal(
  finatic: SessionBearingClient,
  mode: EnvironmentMode,
  environment: EnvironmentType,
  options: PortalLinkOptions & PortalCallbacks = {}
) {
  const sessionId = getSessionId(finatic);
  if (!sessionId) {
    throw new Error('Session not initialized. Reinitialize the SDK before opening Connect.');
  }

  const response = await fetch('/api/portalLink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, mode, environment }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to create v1 portal link');
  }

  showPortalFrame(appendPortalOptions(payload.portalUrl, options), sessionId, options);
}
