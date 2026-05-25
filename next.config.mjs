/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from Unsplash (used as category defaults for food listings)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
