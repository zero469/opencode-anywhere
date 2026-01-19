import type { NextConfig } from "next";

const isNativeBuild = process.env.BUILD_TARGET === "native";

const nextConfig: NextConfig = {
  ...(isNativeBuild && { output: "export" }),
  images: {
    unoptimized: isNativeBuild,
  },
};

export default nextConfig;
