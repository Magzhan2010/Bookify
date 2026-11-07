/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ]
  },
  // Импортируем из этих библиотек только то, что реально используется —
  // меньше JavaScript на каждой странице
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion', 'sonner']
  },
  // Статика (картинки призов, монеты) кешируется браузером надолго
  async headers() {
    return [
      {
        source: '/(coins|prizes)/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }]
      }
    ]
  }
};

export default nextConfig;
