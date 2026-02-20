import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack for production builds
  // Turbopack WASM bindings are not fully supported
};

export default nextConfig;
