import path from "node:path";
import type { NextConfig } from "next";

// モノレポのルート。packages/* を standalone の出力に含めるため、トレースの起点をここにする
const monorepoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  // VPS ではビルドせず、GitHub Actions でビルドした成果物を置いて node server.js で起動する
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/bill-thumbnails/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/bill-thumbnails/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/bill-thumbnails/**",
      },
    ],
  },
};

export default nextConfig;
