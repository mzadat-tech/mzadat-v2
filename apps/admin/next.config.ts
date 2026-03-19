import type { NextConfig } from 'next'

process.env.TMZN ??= 'Asia/Muscat'

const nextConfig: NextConfig = {
  transpilePackages: ['@mzadat/ui', '@mzadat/db', '@mzadat/config'],
  images: {
    unoptimized: true, // images already optimised at upload (Sharp WebP q82, max 1920px) — bypass _next/image
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
