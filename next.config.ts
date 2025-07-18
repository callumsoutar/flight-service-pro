import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      "koviyikwttwsogmbseab.supabase.co",
      "media2.dev.to",
      "www.gravatar.com",
      // add other allowed domains here if needed
      'optimalw.com',
    ],
  },
};

export default nextConfig;