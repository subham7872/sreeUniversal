/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a production build run alongside "npm run dev" without clobbering its cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
