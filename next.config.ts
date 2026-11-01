import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Keep the server build's file-trace from sweeping huge trees it never needs.
  // Combined with the turbopackIgnore on the store/ledger fs reads, this stops
  // the >8GB build-memory blowup once @bryntum is in node_modules.
  outputFileTracingExcludes: {
    "*": ["node_modules/@bryntum/**", "video/**"],
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
