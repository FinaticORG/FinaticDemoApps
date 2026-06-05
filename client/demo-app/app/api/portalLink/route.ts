import { NextResponse } from 'next/server';
import { getApiKey, getApiUrl, type EnvironmentMode, type EnvironmentType } from '@/lib/utils';

function getConnectUrl(environment: EnvironmentType) {
  const envUrl =
    process.env.NEXT_PUBLIC_FINATIC_CONNECT_URL ||
    process.env.FINATIC_CONNECT_URL ||
    process.env.CONNECT_PORTAL_URL ||
    process.env.PUBLIC_PORTAL_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return environment === 'dev' ? 'http://localhost:3000' : 'https://connect.finatic.dev';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = String(body.sessionId || '');
    const mode = (body.mode || 'live') as EnvironmentMode;
    const environment = (body.environment || 'dev') as EnvironmentType;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const apiKey = getApiKey(mode, environment);
    const apiUrl = getApiUrl(environment, 'http://localhost:8000');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server configuration error - missing Finatic API key' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${apiUrl}/api/v1/sessions/${encodeURIComponent(sessionId)}/portal-links`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'X-Finatic-Environment': mode,
          'Content-Type': 'application/json',
        },
      }
    );

    const responseText = await response.text();
    let data: any = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { error: responseText };
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || data.message || data.error || 'Failed to create portal link' },
        { status: response.status }
      );
    }

    const token = data.success?.data?.one_time_token ?? data.data?.one_time_token;
    if (!token) {
      return NextResponse.json({ error: 'Portal link response did not include a token' }, { status: 502 });
    }

    const portalUrl = new URL('/auth', getConnectUrl(environment));
    portalUrl.searchParams.set('token', token);
    return NextResponse.json({ portalUrl: portalUrl.toString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create portal link' },
      { status: 500 }
    );
  }
}
