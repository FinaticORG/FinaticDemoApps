/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FINATIC_API_URL?: string
  readonly VITE_FINATIC_ENVIRONMENT?: string
  readonly VITE_FINATIC_CONNECT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
