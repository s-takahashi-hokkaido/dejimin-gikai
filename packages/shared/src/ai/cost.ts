import { AI_MODELS } from "./models";

/**
 * AI 利用コストの計算と上限の判定に使う純粋関数（web と admin で共通）
 *
 * DB にも環境変数にも触らない。
 */

/** モデルごとの料金（USD / 100万トークン） */
export type ModelPricing = {
  inputTokensPerMillionUsd: number;
  outputTokensPerMillionUsd: number;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  [AI_MODELS.gpt4o]: {
    inputTokensPerMillionUsd: 2.5,
    outputTokensPerMillionUsd: 10,
  },
  [AI_MODELS.gpt4o_mini]: {
    inputTokensPerMillionUsd: 0.15,
    outputTokensPerMillionUsd: 0.6,
  },
  [AI_MODELS.gpt4_1]: {
    inputTokensPerMillionUsd: 2,
    outputTokensPerMillionUsd: 8,
  },
  [AI_MODELS.gpt4_1_mini]: {
    inputTokensPerMillionUsd: 0.4,
    outputTokensPerMillionUsd: 1.6,
  },
  [AI_MODELS.gpt4_1_nano]: {
    inputTokensPerMillionUsd: 0.1,
    outputTokensPerMillionUsd: 0.4,
  },
  [AI_MODELS.o3_mini]: {
    inputTokensPerMillionUsd: 1.1,
    outputTokensPerMillionUsd: 4.4,
  },
  [AI_MODELS.o4_mini]: {
    inputTokensPerMillionUsd: 1.1,
    outputTokensPerMillionUsd: 4.4,
  },
  [AI_MODELS.gpt5]: {
    inputTokensPerMillionUsd: 1.25,
    outputTokensPerMillionUsd: 10,
  },
  [AI_MODELS.gpt5_mini]: {
    inputTokensPerMillionUsd: 0.25,
    outputTokensPerMillionUsd: 2,
  },
  [AI_MODELS.gpt5_nano]: {
    inputTokensPerMillionUsd: 0.05,
    outputTokensPerMillionUsd: 0.4,
  },
  [AI_MODELS.gpt5_chat]: {
    inputTokensPerMillionUsd: 1.25,
    outputTokensPerMillionUsd: 10,
  },
  [AI_MODELS.gpt5_1_chat]: {
    inputTokensPerMillionUsd: 1.25,
    outputTokensPerMillionUsd: 10,
  },
  [AI_MODELS.gpt5_1]: {
    inputTokensPerMillionUsd: 1.25,
    outputTokensPerMillionUsd: 10,
  },
  [AI_MODELS.gpt5_2]: {
    inputTokensPerMillionUsd: 1.75,
    outputTokensPerMillionUsd: 14,
  },
};

const COST_DECIMALS = 6;

/** コストを小数6桁に丸める。0以下・数値でないものは0 */
export function roundCost(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const scale = 10 ** COST_DECIMALS;
  return Math.round(value * scale) / scale;
}

/**
 * トークン数からコスト(USD)を計算する。料金の分からないモデルは null
 */
export function calculateTokenCostUsd(
  model: string,
  usage: { inputTokens: number; outputTokens: number }
): number | null {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    return null;
  }

  const inputCost =
    (pricing.inputTokensPerMillionUsd * usage.inputTokens) / 1_000_000;
  const outputCost =
    (pricing.outputTokensPerMillionUsd * usage.outputTokens) / 1_000_000;

  return roundCost(inputCost + outputCost);
}

/**
 * JST基準の1日の時間範囲を取得（UTCのISO文字列で返す）
 *
 * @param now 基準時刻。省略時は現在時刻
 */
export function getJstDayRange(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffsetMs);

  const startOfJstDay = new Date(
    Date.UTC(
      jstNow.getUTCFullYear(),
      jstNow.getUTCMonth(),
      jstNow.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  const startUtc = new Date(startOfJstDay.getTime() - jstOffsetMs);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

  return { from: startUtc.toISOString(), to: endUtc.toISOString() };
}

/**
 * 環境変数の値をコスト上限(USD)としてパースする
 *
 * 未設定・空文字の場合はフォールバック値を使う。
 * 数値として不正、または0以下の場合は null を返す（呼び出し側でエラーにする）。
 */
export function parseCostLimitUsd(
  raw: string | undefined,
  fallbackUsd: number
): number | null {
  const source = raw !== undefined && raw.trim() !== "" ? raw : null;
  const value = source === null ? fallbackUsd : Number(source);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}
