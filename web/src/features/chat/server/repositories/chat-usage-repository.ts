import "server-only";

import type { Database } from "@dejimin-gikai/supabase";
import { createAdminClient } from "@dejimin-gikai/supabase";

type ChatUsageInsert =
  Database["public"]["Tables"]["chat_usage_events"]["Insert"];

type ChatUsageRow = Database["public"]["Tables"]["chat_usage_events"]["Row"];

export type { ChatUsageInsert, ChatUsageRow };

export async function insertChatUsageEvent(payload: ChatUsageInsert) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("chat_usage_events").insert(payload);
  if (error) {
    throw new Error(`Failed to record chat usage: ${error.message}`, {
      cause: error,
    });
  }
}

/**
 * AI利用コスト(USD)の合計を取得する
 *
 * 行を全件取得してJS側で合算すると PostgREST の max_rows で打ち切られ、
 * コストを過小評価して上限判定が効かなくなる。そのためDB側の集計関数を使う。
 *
 * @param userId 省略すると全ユーザーの合計を返す
 */
export async function sumAiUsageCostUsd(
  fromIso: string,
  toIso: string,
  userId?: string
): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_ai_usage_cost_usd", {
    from_ts: fromIso,
    to_ts: toIso,
    ...(userId ? { target_user_id: userId } : {}),
  });

  if (error) {
    throw new Error(`Failed to sum AI usage cost: ${error.message}`, {
      cause: error,
    });
  }

  return data ?? 0;
}
