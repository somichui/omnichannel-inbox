import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    appIsrStatus: false, // Next 15+ 
    buildActivity: false,
  }
};

export default nextConfig;
