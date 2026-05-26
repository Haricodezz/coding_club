import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow images from external sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.dicebear.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'codeforces.com' },
    ],
  },
  // Empty turbopack config (Next.js 16 uses Turbopack by default)
  turbopack: {},
};

export default nextConfig;
