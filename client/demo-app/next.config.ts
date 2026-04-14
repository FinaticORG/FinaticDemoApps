import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '..'),
  transpilePackages: ['@finatic/client'],
  async redirects() {
    return [{ source: '/settings', destination: '/developer', permanent: false }];
  },
  experimental: {
    esmExternals: 'loose',
    externalDir: true,
  },
};

export default nextConfig;
