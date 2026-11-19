import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const version = (pkg) => JSON.parse(readFileSync(new URL('./node_modules/' + pkg + '/package.json', import.meta.url))).version;

export default defineConfig({
  define: {
    __FINATIC_CLIENT_VERSION__: JSON.stringify(version('@finatic/client')),
    __CAPACITOR_VERSION__: JSON.stringify(version('@capacitor/core')),
    // @finatic/client reads optional process.env defaults; nothing is injected.
    'process.env': '{}',
  },
  build: { target: 'es2020', outDir: 'dist', emptyOutDir: true },
});
