import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self' data:;
  media-src 'self' blob:;
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`.replace(/\s{2,}/g, ' ').trim();

const permissionsPolicy = [
  "camera=(self)",
  "microphone=()",
  "geolocation=()",
  "browsing-topics=()",
  "payment=()",
  "usb=()",
  "interest-cohort=()",
  "accelerometer=()",
  "gyroscope=()",
  "magnetometer=()",
  "display-capture=()",
  "sync-xhr=()",
].join(", ");

const nextConfig: NextConfig = {
  /* config options here */
  compress: true,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    optimizePackageImports: ["gsap", "@gsap/react", "lucide-react"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/favicon.ico",
        destination: "/icon.svg",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: permissionsPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
