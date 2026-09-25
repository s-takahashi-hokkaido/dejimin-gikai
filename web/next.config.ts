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
    // 議案サムネイル（Supabase Storage の bill-thumbnails バケット）の配信元。
    // next.config はビルド時に評価されるため、NEXT_PUBLIC_SUPABASE_URL から組み立てると
    // ビルド環境に値が渡っていないだけで許可が抜け、本番で画像が 400 になる。
    // ホストは少数で変わる頻度も低いので、環境変数に頼らずハードコードする。
    // web と admin で同じ定義を持つので、変えるときは両方を直すこと。
    remotePatterns: [
      // さくらVPS のセルフホスト Supabase（storage-api を nginx 経由で公開）
      {
        protocol: "https",
        hostname: "db.ezocivic.tech",
        pathname: "/storage/v1/object/public/bill-thumbnails/**",
      },
      // ローカルの Supabase（supabase start / infra/compose.yml）
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
      // Supabase Cloud。VPS への移行が終わり、DB の thumbnail_url が
      // *.supabase.co を指していないことを確かめてから外す
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/bill-thumbnails/**",
      },
    ],
  },
};

export default nextConfig;
