import { isFlagEnabled } from "./utils/is-flag-enabled";

/**
 * 環境変数の設定
 * アプリケーション全体で使用する環境変数を一元管理
 */

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    "環境変数 NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません"
  );
}

export const env = {
  webUrl: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  revalidateSecret: process.env.REVALIDATE_SECRET,
  /**
   * Claude CLI を使う機能（AI情報収集・注目議案の自動選定・議案コンテンツの情報補完）を有効にするか。
   * ADMIN_ENABLE_CLAUDE_CLI=true を明示したローカル環境だけで有効。未設定の本番では無効。
   * サーバー専用の変数のため、Client Component から参照すると常に false になる。
   */
  claudeCliEnabled: isFlagEnabled(process.env.ADMIN_ENABLE_CLAUDE_CLI),
} as const;

// 型定義
export type Env = typeof env;
