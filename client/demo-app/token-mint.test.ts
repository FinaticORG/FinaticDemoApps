import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { finaticTokenMintMiddleware } from './src/tokenMint'

type Middleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => Promise<void>

function request(remoteAddress: string, host: string, origin: string): IncomingMessage {
  return {
    url: '/api/finatic/token',
    method: 'POST',
    headers: { host, origin },
    socket: { remoteAddress },
  } as unknown as IncomingMessage
}

function response() {
  let body = ''
  return {
    value: {
      statusCode: 200,
      setHeader: vi.fn(),
      end: (value: string) => {
        body = value
      },
    } as unknown as ServerResponse,
    body: () => body,
  }
}

const middleware = (): Middleware =>
  finaticTokenMintMiddleware('company-key', 'https://api.finatic.dev', 'sandbox')

describe('Finatic token mint boundary', () => {
  it('rejects non-local callers without contacting Finatic', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const output = response()

    await middleware()(
      request('192.0.2.10', 'demo.example:5174', 'https://demo.example:5174'),
      output.value,
      vi.fn(),
    )

    expect(output.value.statusCode).toBe(403)
    expect(JSON.parse(output.body())).toEqual({
      error: 'Token mint requests must be same-origin and local.',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mints for the intended same-origin loopback flow', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 201,
      json: async () => ({ token: 'one-time-token' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const output = response()

    await middleware()(
      request('127.0.0.1', '127.0.0.1:5174', 'http://127.0.0.1:5174'),
      output.value,
      vi.fn(),
    )

    expect(output.value.statusCode).toBe(201)
    expect(JSON.parse(output.body())).toEqual({ token: 'one-time-token' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
