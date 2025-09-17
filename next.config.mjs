/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/api/auth/google",
        destination: "/api/auth/signin/google",
        permanent: false,
      },
      {
        source: "/api/auth/facebook",
        destination: "/api/auth/signin/facebook",
        permanent: false,
      },
    ];
  },
};
export default nextConfig;
