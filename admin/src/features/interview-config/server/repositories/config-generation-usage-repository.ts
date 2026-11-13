import "server-only";

import { createAdminClient } from "@dejimin-gikai/supabase";
import { CONFIG_GENERATION_PROMPT_NAME } from "../../shared/constants";

/**
 * 議題のインタビュー設定の AI 生成の利用量（作成者ごとの1日の上限のため）
 *
 * web の AI 利用量と同じ chat_usage_events に記録する。サイト全体の合計からは DB 関数の側で除かれる。
 */

/** その利用者が期間内に使った AI 利用コスト（USD） */
export async function sumUserAiUsageCostUsd(
  userId: string,
  fromIso: string,
  toIso: string
): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_ai_usage_cost_usd", {
    from_ts: fromIso,
    to_ts: toIso,
    target_user_id: userId,
  });

  if (error) {
    throw new Error(`Failed to sum AI usage cost: ${error.message}`, {
      cause: error,
    });
  }

  return Number(data ?? 0);
}

/** 設定の AI 生成の利用量を記録する */
export async function insertConfigGenerationUsage(params: {
  userId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  topicId: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("chat_usage_events").insert({
    user_id: params.userId,
    prompt_name: CONFIG_GENERATION_PROMPT_NAME,
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    total_tokens: params.inputTokens + params.outputTokens,
    cost_usd: params.costUsd,
    metadata: { interview_topic_id: params.topicId },
  });

  if (error) {
    throw new Error(`Failed to record AI usage: ${error.message}`, {
      cause: error,
    });
  }
}
