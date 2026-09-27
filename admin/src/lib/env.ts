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
  /**
   * revalidate（Web側のキャッシュ無効化）をサーバー間で送るときの宛先。
   * 公開前の VPS はホストの nginx が web の全パスに Basic 認証をかけるため、
   * 公開URL経由だと 401 になる。`http://127.0.0.1:3004` のように nginx を通らない
   * URL を入れると、そちらへ直接送る。未設定なら webUrl にフォールバックする。
   * サーバー専用の変数。NEXT_PUBLIC_ を付けないこと（ブラウザに 127.0.0.1 を配らない）。
   */
  webInternalUrl: process.env.WEB_INTERNAL_URL,
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
