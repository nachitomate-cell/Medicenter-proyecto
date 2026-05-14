import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
    outputFileTracingIncludes: {
      "/api/audit": ["./prompts/**"],
    },
  },
};

export default nextConfig;
