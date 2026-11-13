import "server-only";

import {
  calculateTokenCostUsd,
  getJstDayRange,
} from "@dejimin-gikai/shared/ai/cost";
import { env } from "@/lib/env";
import { isDailyBudgetExhausted } from "../../shared/utils/is-daily-budget-exhausted";
import {
  insertConfigGenerationUsage,
  sumUserAiUsageCostUsd,
} from "../repositories/config-generation-usage-repository";
import type { ConfigGenerationUsage } from "./handle-config-generation";

/**
 * 議題の作成者による、インタビュー設定の AI 生成の1日の上限
 *
 * docs/20261113_2018_AIインタビュー広場_プロンプト設計.md §3-4。
 * 上限は作成者ごと（JST の1日）。サイト全体の上限には数えない（DB 関数の側で除く）。
 */

/** 今日（JST）の利用額が、作成者ごとの上限に達しているか */
export async function isConfigGenerationBudgetExhausted(
  userId: string,
  now: Date = new Date()
): Promise<boolean> {
  const { from, to } = getJstDayRange(now);
  const usedUsd = await sumUserAiUsageCostUsd(userId, from, to);
  return isDailyBudgetExhausted(
    usedUsd,
    env.plazaConfigGenerationDailyCostLimitUsd
  );
}

/** 生成1回の利用量を記録する。料金の分からないモデルは0円で記録する（トークン数は残る） */
export async function recordConfigGenerationUsage(params: {
  userId: string;
  topicId: string;
  usage: ConfigGenerationUsage;
}) {
  const { usage } = params;
  await insertConfigGenerationUsage({
    userId: params.userId,
    topicId: params.topicId,
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUsd: calculateTokenCostUsd(usage.model, usage) ?? 0,
  });
}
