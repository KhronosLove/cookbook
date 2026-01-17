import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // 开发环境不启用
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 你原本的配置
}

module.exports = withPWA(nextConfig)