import type { LanguageModelUsage } from "ai";
import {
  calculateTokenCostUsd,
  MODEL_PRICING,
  type ModelPricing,
  roundCost,
} from "@dejimin-gikai/shared/ai/cost";

export type SanitizedUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

/** モデルごとの料金。admin と同じ表を使うため packages/shared に置いている */
export const modelPricing: Record<string, ModelPricing> = MODEL_PRICING;

export type { ModelPricing };

export function sanitizeUsage(usage: LanguageModelUsage): SanitizedUsage {
  const inputTokens = ensureInteger(usage.inputTokens);
  const outputTokens = ensureInteger(usage.outputTokens);
  let totalTokens = ensureInteger(usage.totalTokens);

  if (inputTokens > 0 || outputTokens > 0) {
    if (totalTokens <= 0) {
      totalTokens = ensureInteger(inputTokens + outputTokens);
    }
    return { inputTokens, outputTokens, totalTokens };
  }

  if (totalTokens > 0) {
    const half = Math.floor(totalTokens / 2);
    return {
      inputTokens: half,
      outputTokens: totalTokens - half,
      totalTokens,
    };
  }

  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

export function calculateUsageCostUsd(
  model: string,
  usage: SanitizedUsage
): number {
  const cost = calculateTokenCostUsd(model, usage);
  if (cost === null) {
    throw new Error(`Unknown pricing for model "${model}"`);
  }

  return cost;
}

export { roundCost };

function ensureInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}
