/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    useTypeScriptCli: true,
  },
};

export default nextConfig;
