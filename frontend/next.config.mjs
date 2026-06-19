// Next.js 14 does not support next.config.ts — must use .mjs (ESM) or .js.
// This is functionally identical to the original next.config.ts.

/** @type {import('next').NextConfig} */
const nextConfig = {
  // On Vercel: normal Next.js mode (no static export).
  // For Capacitor mobile builds: set OUTPUT=export in your environment.
  ...(process.env.OUTPUT === 'export' ? {
    output: 'export',
    trailingSlash: true,
  } : {}),

  images: {
    unoptimized: true,
  },

  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
  },
}

export default nextConfig
