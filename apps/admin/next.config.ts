import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@mzadat/ui', '@mzadat/db', '@mzadat/config'],
  images: {
    minimumCacheTTL: 604800, // 7 days
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
