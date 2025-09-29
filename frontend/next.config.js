/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      'i.gr-assets.com',
      'images.gr-assets.com',
      's.gr-assets.com',
      'www.goodreads.com',
      'goodreads.com'
    ],
  },
}

module.exports = nextConfig