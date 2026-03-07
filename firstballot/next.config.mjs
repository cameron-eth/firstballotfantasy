/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: '/Users/cameron/Documents/APP-BUILDS/FIRSTBALLOTFF/firstballotfantasy/firstballot',
  },
}

export default nextConfig
