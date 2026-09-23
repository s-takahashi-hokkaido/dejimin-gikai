/**
 * 環境変数の設定
 * アプリケーション全体で使用する環境変数を一元管理
 */

import { parseCostLimitUsd } from "./ai/cost-guard";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    "環境変数 NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません"
  );
}

/**
 * コスト上限の環境変数を読み取る。不正値ならアプリを起動させない
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

/** AIチャットのユーザー単位・日次コスト上限 */
const chatDailyCostLimitUsd = readCostLimitUsd(
  process.env.CHAT_DAILY_COST_LIMIT_USD,
  0.5,
  "CHAT_DAILY_COST_LIMIT_USD"
);

/** AIインタビューのユーザー単位・日次コスト上限 */
const interviewDailyCostLimitUsd = readCostLimitUsd(
  process.env.INTERVIEW_DAILY_COST_LIMIT_USD,
  0.5,
  "INTERVIEW_DAILY_COST_LIMIT_USD"
);

/**
 * サイト全体の日次コスト上限
 *
 * 匿名認証はクッキーを消せば作り直せるため、ユーザー単位の上限だけでは
 * 総額を抑えられない。実際の請求額を守るのはこちらの上限。
 */
const aiGlobalDailyCostLimitUsd = readCostLimitUsd(
  process.env.AI_GLOBAL_DAILY_COST_LIMIT_USD,
  5,
  "AI_GLOBAL_DAILY_COST_LIMIT_USD"
);

export const env = {
  webUrl: process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000",
  adminUrl: process.env.ADMIN_URL || "http://localhost:3001",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  revalidateSecret: process.env.REVALIDATE_SECRET,
  analytics: {
    gaTrackingId: process.env.NEXT_PUBLIC_GA_TRACKING_ID,
  },
  chat: {
    dailyCostLimitUsd: chatDailyCostLimitUsd,
  },
  interview: {
    dailyCostLimitUsd: interviewDailyCostLimitUsd,
  },
  aiCost: {
    globalDailyLimitUsd: aiGlobalDailyCostLimitUsd,
  },
} as const;

// 型定義
export type Env = typeof env;
