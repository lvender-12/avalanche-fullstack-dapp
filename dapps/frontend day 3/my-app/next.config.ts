/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      root: __dirname, // pakai root folder project
    },
  },
};

module.exports = nextConfig;
