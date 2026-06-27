import { getApiKey, getApiUrl, getConnectPortalUrl, type EnvironmentMode, type EnvironmentType } from '@/lib/utils';

export { getConnectPortalUrl };

type FinaticApiEnvelope<T> = {
  success?: { data?: T };
  error?: { message?: string; code?: string };
};

type SessionResponseData = {
  session_id: string;
};

type TokenResponseData = {
  one_time_token: string;
  expires_at?: string;
};

async function parseFinaticResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();
  let payload: FinaticApiEnvelope<T> & { detail?: string; message?: string };
  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(responseText || 'Invalid response from Finatic API');
  }

  if (!response.ok) {
    throw new Error(
      payload.detail ||
        payload.message ||
        payload.error?.message ||
        `Finatic API request failed (${response.status})`,
    );
  }

  const data = payload.success?.data;
  if (!data) {
    throw new Error('Finatic API response did not include success.data');
  }

  return data;
}

export async function createFinaticOneTimeToken(
  mode: EnvironmentMode,
  environment: EnvironmentType,
): Promise<TokenResponseData> {
  const apiKey = getApiKey(mode, environment);
  const apiUrl = getApiUrl(environment, 'http://localhost:8000');

  if (!apiKey) {
    throw new Error('Server configuration error - missing Finatic API key');
  }

  const sessionResponse = await fetch(`${apiUrl}/api/v1/sessions`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'X-Finatic-Environment': mode,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      environment: mode,
      metadata: {
        demo: 'client/demo-app',
        runtimeEnvironment: environment,
      },
    }),
  });

  const sessionData = await parseFinaticResponse<SessionResponseData>(sessionResponse);

  const portalLinkResponse = await fetch(
    `${apiUrl}/api/v1/sessions/${encodeURIComponent(sessionData.session_id)}/portal-links`,
    {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'X-Finatic-Environment': mode,
        'Content-Type': 'application/json',
      },
    },
  );

  return parseFinaticResponse<TokenResponseData>(portalLinkResponse);
}
