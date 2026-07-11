/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    // Note: SUPABASE_ANON_KEY is safe to expose to browser
  },
};

module.exports = nextConfig;
