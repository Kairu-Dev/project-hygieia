import { withSentryConfig } from "@sentry/nextjs";
import { fileURLToPath } from 'url';
import type { NextConfig } from "next";

const __filename = fileURLToPath(import.meta.url);

const nextConfig: NextConfig = {

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },

  experimental: {
  },

  webpack: (config, { dev }) => {
    if (dev) {
      config.infrastructureLogging = { level: 'error' };

      // Keep file cache but make it more reliable
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename]
        }
      };

      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/C:/DumpStack.log.tmp',
          '**/C:/pagefile.sys',
          '**/C:/hiberfil.sys',
          '**/C:/swapfile.sys'
        ]
      };
    }
    return config;
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/sentry-example-page',
          destination: '/404',
        },
      ];
    }
    return [];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "kyle-soliman-project-hygieia",

  project: "project-hygieia",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors.
    automaticVercelMonitors: true,
  },

  // Tree-shaking options for reducing bundle size
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
