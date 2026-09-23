/**
 * 1インタビューあたりの推定コスト算出
 *
 * 推定前提（実測ベース: GPT-5.1 Instant / 15ターン）:
 * - 1インタビューあたり入力トークン: 約85,000（システムプロンプト + 履歴の累積）
 * - 1インタビューあたり出力トークン: 約3,000（AI応答の合計）
 */

import { AI_MODELS } from "@/lib/ai/models";

type ModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
};

/** 1インタビューあたりの推定トークン使用量 */
const ESTIMATED_INPUT_TOKENS = 85_000;
const ESTIMATED_OUTPUT_TOKENS = 3_000;

/**
 * モデルごとの料金（USD / 1Mトークン）
 * web/src/lib/ai/calculate-ai-cost.ts の modelPricing と同じ値
 */
const MODEL_PRICING: Record<string, ModelPricing> = {
  [AI_MODELS.gpt4o_mini]: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  [AI_MODELS.gpt5]: { inputPerMillion: 1.25, outputPerMillion: 10 },
  [AI_MODELS.gpt5_mini]: { inputPerMillion: 0.25, outputPerMillion: 2 },
  [AI_MODELS.gpt5_nano]: { inputPerMillion: 0.05, outputPerMillion: 0.4 },
  [AI_MODELS.gpt5_chat]: { inputPerMillion: 1.25, outputPerMillion: 10 },
  [AI_MODELS.gpt5_1_chat]: { inputPerMillion: 1.25, outputPerMillion: 10 },
  [AI_MODELS.gpt5_1]: { inputPerMillion: 1.25, outputPerMillion: 10 },
  [AI_MODELS.gpt5_2]: { inputPerMillion: 1.75, outputPerMillion: 14 },
};

/**
 * モデルIDから1インタビューあたりの推定コスト（USD）を算出する
 * @returns 推定コスト（USD）。不明なモデルの場合は null
 */
export function estimateInterviewCostUsd(modelId: string): number | null {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) return null;

  const inputCost =
    (pricing.inputPerMillion * ESTIMATED_INPUT_TOKENS) / 1_000_000;
  const outputCost =
    (pricing.outputPerMillion * ESTIMATED_OUTPUT_TOKENS) / 1_000_000;

  return inputCost + outputCost;
}

/** USD→JPY換算レート */
const USD_TO_JPY = 150;

/**
 * 推定コストを日本円の表示用文字列にフォーマットする
 * 例: "~2円", "~21円", "~75円"
 */
export function formatEstimatedCost(costUsd: number): string {
  const yen = Math.round(costUsd * USD_TO_JPY);
  if (yen < 1) {
    return "~1円";
  }
  return `~${yen}円`;
}
