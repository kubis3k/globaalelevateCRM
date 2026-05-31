import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Node-only mail libs — don't bundle; require at runtime on the server.
  serverExternalPackages: ['imapflow', 'nodemailer', 'mailparser'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
