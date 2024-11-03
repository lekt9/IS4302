/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
      domains: ['localhost'], // 如果需要从特定域名加载图片
    },
    // 其他配置...
  }
  
  module.exports = nextConfig