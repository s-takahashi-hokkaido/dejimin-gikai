import { parseCostLimitUsd } from "@dejimin-gikai/shared/ai/cost";
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

/**
 * コスト上限の環境変数を読み取る。不正値ならアプリを起動させない（web/src/lib/env.ts と同じ扱い）
 */
function readCostLimitUsd(
  raw: string | undefined,
  fallbackUsd: number,
  name: string
): number {
  const value = parseCostLimitUsd(raw, fallbackUsd);
  if (value === null) {
    throw new Error(`環境変数 ${name} は正の数値で指定してください`);
  }
  return value;
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
  /**
   * AIインタビュー広場（議題の作成・管理）を有効にするか。
   * ADMIN_ENABLE_PLAZA=true を明示したときだけ有効。未設定なら、ナビに出さず画面も開けない。
   * 公開（実装タスク分割の P12）まで本番では設定しない。
   * サーバー専用の変数のため、Client Component から参照すると常に false になる。
   */
  plazaEnabled: isFlagEnabled(process.env.ADMIN_ENABLE_PLAZA),
  /**
   * AIインタビュー広場で、議題の作成者1人がインタビュー設定の AI 生成に1日（JST）に使える金額（USD）。
   * 未設定なら 1。運営者の議案での AI 生成には上限をかけない
   */
  plazaConfigGenerationDailyCostLimitUsd: readCostLimitUsd(
    process.env.ADMIN_PLAZA_CONFIG_GENERATION_DAILY_COST_LIMIT_USD,
    1,
    "ADMIN_PLAZA_CONFIG_GENERATION_DAILY_COST_LIMIT_USD"
  ),
} as const;

// 型定義
export type Env = typeof env;
