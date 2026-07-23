import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TS chyby nyní build zastaví (baseline 0 chyb, tsconfig strict).
  // Historicky bylo true; viz docs/adr/0002. Ověřuj `npm run typecheck`.
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    // Veřejná přihláška na kariérní stránce nahrává CV přes server action.
    serverActions: { bodySizeLimit: '10mb' },
  },
  // Node-only mail/push libs — don't bundle; require at runtime on the server.
  serverExternalPackages: ['imapflow', 'nodemailer', 'mailparser', 'web-push', 'pg'],
  // esm-potrace-wasm (client-only, lazy) references node 'fs'/'path' in a
  // Node-only guarded branch; stub them so the browser bundle resolves.
  turbopack: {
    resolveAlias: {
      fs: { browser: './src/lib/node-empty.js' },
      path: { browser: './src/lib/node-empty.js' },
    },
  },
  async redirects() {
    return [
      {
        // Hlavní doména → interní app. Na kariérní doméně (jobs.*) se neuplatní
        // (root řeší host-rewrite v middleware na /jobs).
        source: '/',
        destination: '/dashboard',
        permanent: false,
        missing: [{ type: 'host', value: 'jobs.globaalelevate.com' }],
      },
    ]
  },
  async headers() {
    return [
      {
        // Always serve the freshest service worker, typed correctly.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },
};

export default nextConfig;
