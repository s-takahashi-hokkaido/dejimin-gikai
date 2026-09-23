/**
 * AIモデルの識別子を一元管理する定数（OpenAI API のモデルID）
 *
 * LLM は OpenAI を直接呼ぶ（`@ai-sdk/openai` の `openai(modelId)`）。
 * プライバシーポリシーで送信先を OpenAI 1社としているため、他社のモデルは足さないこと。
 */
export const AI_MODELS = {
  gpt4o: "gpt-4o",
  gpt4o_mini: "gpt-4o-mini",
  gpt4_1: "gpt-4.1",
  gpt4_1_mini: "gpt-4.1-mini",
  gpt4_1_nano: "gpt-4.1-nano",
  o3_mini: "o3-mini",
  o4_mini: "o4-mini",
  gpt5: "gpt-5",
  gpt5_mini: "gpt-5-mini",
  gpt5_nano: "gpt-5-nano",
  gpt5_chat: "gpt-5-chat-latest",
  gpt5_1: "gpt-5.1",
  gpt5_1_chat: "gpt-5.1-chat-latest",
  gpt5_2: "gpt-5.2",
} as const;

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

/**
 * インタビューチャットのデフォルトモデル
 *
 * 公開サイトでは利用量が読めないため、既定は安価なモデルにする。
 * gpt5_2 比で入力1/7・出力1/7のコスト。議案ごとに変えたい場合は
 * interview_configs.chat_model で上書きする。
 */
export const DEFAULT_INTERVIEW_CHAT_MODEL = AI_MODELS.gpt5_mini;

/**
 * インタビューの要約（summary フェーズ）で使うモデル
 *
 * 議案ごとの chat_model に左右されず、要約の品質を一定にするため固定する。
 */
export const INTERVIEW_SUMMARY_MODEL = AI_MODELS.gpt5_mini;
