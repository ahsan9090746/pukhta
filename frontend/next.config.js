/** @type {import('next').NextConfig} */
// Backend origin derived from NEXT_PUBLIC_API_URL (e.g.
// "https://pukhta-backend.onrender.com/api" -> "https://pukhta-backend.onrender.com").
// NEXT_PUBLIC_* vars are inlined at build time, so this picks up the Render
// production value during `next build` and falls back to localhost for dev.
const backendBase = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'
).replace(/\/api\/?$/, '');

const nextConfig = {
  outputFileTracingRoot: __dirname,
  allowedDevOrigins: ['192.168.100.6'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'pukhta-backend.onrender.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5001',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5001',
      },
      // LAN dev access (e.g. http://192.168.100.6:3000 with API at :5001).
      // Exact host fixes today's error; wildcards survive DHCP IP changes.
      {
        protocol: 'http',
        hostname: '192.168.100.6',
        port: '5001',
      },
      {
        protocol: 'http',
        hostname: '192.168.*.*',
      },
      {
        protocol: 'http',
        hostname: '10.*.*.*',
      },
      {
        protocol: 'http',
        hostname: '172.*.*.*',
      },
    ],
  },
  async redirects() {
    return [
      // The About page now lives at /about-us — keep the old URL alive for
      // bookmarks, shared links and anything already indexed by search engines.
      {
        source: '/about',
        destination: '/about-us',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${backendBase}/uploads/:path*`,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  transpilePackages: ['framer-motion', '@tanstack/react-query', 'recharts', 'swiper'],
  experimental: {
    forceSwcTransforms: false,
    // Tree-shake the big icon/animation/query barrels so the homepage
    // downloads only what it renders. No visual or behavior change.
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@tanstack/react-query',
      'date-fns',
      'recharts',
    ],
  },
};

module.exports = nextConfig;
