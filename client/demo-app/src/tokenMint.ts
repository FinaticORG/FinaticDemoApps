import type { IncomingMessage, ServerResponse } from 'node:http'

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[/, '').replace(/\]$/, '')
  return normalized === 'localhost' || normalized === '::1' || /^127(?:\.\d{1,3}){3}$/.test(normalized)
}

function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false
  return isLoopbackHostname(address.replace(/^::ffff:/, ''))
}

export function isTrustedLocalMintRequest(request: IncomingMessage): boolean {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return false

  const host = request.headers.host
  const origin = request.headers.origin
  if (!host || !origin) return false

  try {
    const hostUrl = new URL(`http://${host}`)
    const originUrl = new URL(origin)
    return isLoopbackHostname(hostUrl.hostname) && originUrl.host === hostUrl.host
  } catch {
    return false
  }
}

export function finaticTokenMintMiddleware(
  apiKey: string | undefined,
  apiUrl: string,
  environment: string,
) {
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const requestPath = request.url?.split('?')[0]
    if (requestPath !== '/api/finatic/token' || request.method !== 'POST') {
      next()
      return
    }

    if (!isTrustedLocalMintRequest(request)) {
      response.statusCode = 403
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify({ error: 'Token mint requests must be same-origin and local.' }))
      return
    }

    if (!apiKey) {
      response.statusCode = 500
      response.setHeader('Content-Type', 'application/json')
      response.end(
        JSON.stringify({
          error: 'FINATIC_API_KEY is not set on the demo server. Put it in client/demo-app/.env (not VITE_).',
        }),
      )
      return
    }

    try {
      const finaticResponse = await fetch(`${apiUrl.replace(/\/$/, '')}/api/v1/session/init`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'X-Finatic-Environment': environment,
        },
        body: JSON.stringify({}),
      })
      const payload = await finaticResponse.json().catch(() => ({}))
      response.statusCode = finaticResponse.status
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify(payload))
    } catch (error) {
      response.statusCode = 502
      response.setHeader('Content-Type', 'application/json')
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Token mint failed',
        }),
      )
    }
  }
}
