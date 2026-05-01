import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverComponentsExternalPackages: ['@opentelemetry/api'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias['@opentelemetry/api'] = require.resolve(
        '@opentelemetry/api',
      );
    }
    return config;
  },
};

export default nextConfig;
