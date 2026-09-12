import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { finaticTokenMintMiddleware } from './src/tokenMint'

function finaticTokenMintPlugin(env: Record<string, string>): Plugin {
  const apiUrl = env.VITE_FINATIC_API_URL || 'https://api.finatic.dev'
  const environment = env.VITE_FINATIC_ENVIRONMENT || 'sandbox'

  return {
    name: 'finatic-token-mint',
    configureServer(server) {
      server.middlewares.use(finaticTokenMintMiddleware(env.FINATIC_API_KEY, apiUrl, environment))
    },
    configurePreviewServer(server) {
      server.middlewares.use(finaticTokenMintMiddleware(env.FINATIC_API_KEY, apiUrl, environment))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), finaticTokenMintPlugin(env)],
    server: {
      port: 5174,
      host: '127.0.0.1',
    },
    preview: {
      host: '127.0.0.1',
    },
    define: {
      'process.env': {},
    },
  }
})
