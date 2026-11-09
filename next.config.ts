import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["sharp"],
  experimental: {
    // Les photos sont réduites dans le navigateur avant l'envoi ; cette marge couvre les cas restants.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
