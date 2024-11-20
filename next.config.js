/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'development'
          ? 'http://127.0.0.1:5328/api/:path*'
          : 'https://api-v2-idefi-ai-774576244405.us-west3.run.app/api/:path*',
      },
    ]
  },
};

module.exports = nextConfig;
