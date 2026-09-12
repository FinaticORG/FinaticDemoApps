import { defineConfig, loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

function attachFinaticTokenMint(
  server: ViteDevServer | PreviewServer,
  apiKey: string | undefined,
  apiUrl: string,
  environment: string,
) {
  server.middlewares.use(async (request, response, next) => {
    const requestPath = request.url?.split('?')[0]
    if (requestPath !== '/api/finatic/token' || request.method !== 'POST') {
      next()
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
      const finaticResponse = await fetch(
        `${apiUrl.replace(/\/$/, '')}/api/v1/session/init`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            'X-Finatic-Environment': environment,
          },
          body: JSON.stringify({}),
        },
      )
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
  })
}

function finaticTokenMintPlugin(env: Record<string, string>): Plugin {
  const apiUrl = env.VITE_FINATIC_API_URL || 'https://api.finatic.dev'
  const environment = env.VITE_FINATIC_ENVIRONMENT || 'sandbox'

  return {
    name: 'finatic-token-mint',
    configureServer(server) {
      attachFinaticTokenMint(server, env.FINATIC_API_KEY, apiUrl, environment)
    },
    configurePreviewServer(server) {
      attachFinaticTokenMint(server, env.FINATIC_API_KEY, apiUrl, environment)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), finaticTokenMintPlugin(env)],
    server: {
      port: 5174,
      host: true,
    },
    define: {
      'process.env': {},
    },
  }
})
