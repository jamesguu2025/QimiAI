import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: rootDir,
  },

  // Hide the development indicator
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },

  async redirects() {
    return [
      {
        source: "/api/auth/google",
        destination: "/api/auth/signin/google",
        permanent: false,
      },
      {
        source: "/api/auth/facebook",
        destination: "/api/auth/signin/facebook",
        permanent: false,
      },
      {
        source: "/founder",
        destination: "/about",
        permanent: false,
      },
      {
        source: "/james-family.jpg",
        destination: "/about",
        permanent: false,
      },
    ];
  },

  // 安全 Headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...(isProduction ? [{
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          }] : []),
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
