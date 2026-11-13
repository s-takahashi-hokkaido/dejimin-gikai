import type { ConfigGenerationRequest } from "../schemas";

/**
 * 議題の設定の AI 生成で、1回のリクエストに入れてよい量
 *
 * 作成者ごとの1日の上限は、生成が終わってから利用量を記録して数える。
 * 1回で上限を大きく超えないよう、送れる会話と既存の設定の量をここで抑える。
 */
export const TOPIC_GENERATION_LIMITS = {
  /** 会話のメッセージ数 */
  maxMessages: 40,
  /** 会話・テーマ・質問の文字数の合計 */
  maxTotalChars: 30_000,
  /** テーマの数（確定テーマ・既存テーマそれぞれ） */
  maxThemes: 10,
  /** 既存の質問の数 */
  maxQuestions: 15,
} as const;

/** 議題の設定の AI 生成のリクエストが、量の上限に収まっているか。収まっていなければ理由を返す */
export function validateTopicGenerationRequest(
  request: Pick<
    ConfigGenerationRequest,
    "messages" | "confirmedThemes" | "existingThemes" | "existingQuestions"
  >
): string | null {
  const { messages, confirmedThemes, existingThemes, existingQuestions } =
    request;

  if (messages.length > TOPIC_GENERATION_LIMITS.maxMessages) {
    return "会話が長くなりすぎました。画面を開き直して、最初からやり直してください";
  }
  if (
    (confirmedThemes?.length ?? 0) > TOPIC_GENERATION_LIMITS.maxThemes ||
    (existingThemes?.length ?? 0) > TOPIC_GENERATION_LIMITS.maxThemes ||
    (existingQuestions?.length ?? 0) > TOPIC_GENERATION_LIMITS.maxQuestions
  ) {
    return "テーマか質問が多すぎます";
  }

  const totalChars =
    messages.reduce((sum, m) => sum + m.content.length, 0) +
    [...(confirmedThemes ?? []), ...(existingThemes ?? [])].reduce(
      (sum, theme) => sum + theme.length,
      0
    ) +
    (existingQuestions ?? []).reduce(
      (sum, q) =>
        sum +
        q.question.length +
        (q.follow_up_guide?.length ?? 0) +
        (q.quick_replies ?? []).reduce((s, r) => s + r.length, 0),
      0
    );
  if (totalChars > TOPIC_GENERATION_LIMITS.maxTotalChars) {
    return "会話が長くなりすぎました。画面を開き直して、最初からやり直してください";
  }

  return null;
}
