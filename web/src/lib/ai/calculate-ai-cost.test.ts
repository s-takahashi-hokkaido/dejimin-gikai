import { describe, expect, it } from "vitest";

import {
  calculateUsageCostUsd,
  modelPricing,
  type SanitizedUsage,
  sanitizeUsage,
} from "./calculate-ai-cost";
import { AI_MODELS } from "./models";

describe("calculateUsageCostUsd", () => {
  it("returns 0 when usage has no tokens", () => {
    const usage: SanitizedUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    expect(calculateUsageCostUsd(AI_MODELS.gpt4o, usage)).toBe(0);
  });

  it("calculates cost for known model", () => {
    const usage: SanitizedUsage = {
      inputTokens: 500,
      outputTokens: 1000,
      totalTokens: 1500,
    };

    // 500 input tokens * $2.50/M + 1000 output tokens * $10.00/M = 0.00125 + 0.01 = 0.01125
    expect(calculateUsageCostUsd(AI_MODELS.gpt4o, usage)).toBeCloseTo(0.01125);
  });

  it("calculates cost for new models", () => {
    const usage: SanitizedUsage = {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      totalTokens: 2_000_000,
    };

    // GPT-5.2: $1.75 input + $14.00 output = $15.75
    expect(calculateUsageCostUsd(AI_MODELS.gpt5_2, usage)).toBeCloseTo(15.75);
    // GPT-5 mini: $0.25 input + $2.00 output = $2.25
    expect(calculateUsageCostUsd(AI_MODELS.gpt5_mini, usage)).toBeCloseTo(2.25);
    // GPT-5.1 Instant: $1.25 input + $10.00 output = $11.25
    expect(calculateUsageCostUsd(AI_MODELS.gpt5_1_chat, usage)).toBeCloseTo(
      11.25
    );
  });

  it("has pricing for every model in AI_MODELS", () => {
    for (const model of Object.values(AI_MODELS)) {
      expect(modelPricing[model], model).toBeDefined();
    }
  });

  it("throws for Vercel AI Gateway style model IDs", () => {
    const usage: SanitizedUsage = {
      inputTokens: 1000,
      outputTokens: 1000,
      totalTokens: 2000,
    };

    expect(() => calculateUsageCostUsd("openai/gpt-4o", usage)).toThrow();
  });

  it("throws for unknown model", () => {
    const usage: SanitizedUsage = {
      inputTokens: 1000,
      outputTokens: 1000,
      totalTokens: 2000,
    };

    expect(() => calculateUsageCostUsd("unknown-model", usage)).toThrow(
      'Unknown pricing for model "unknown-model"'
    );
  });
});

describe("sanitizeUsage", () => {
  it("uses provided input/output tokens", () => {
    const usage = sanitizeUsage({
      inputTokens: 100,
      outputTokens: 200,
      totalTokens: 0,
      inputTokenDetails: {
        noCacheTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
      },
      outputTokenDetails: {
        textTokens: undefined,
        reasoningTokens: undefined,
      },
    });

    expect(usage).toEqual({
      inputTokens: 100,
      outputTokens: 200,
      totalTokens: 300,
    });
  });

  it("splits total tokens when input/output missing", () => {
    // biome-ignore lint/suspicious/noExplicitAny: APIレスポンスのシミュレーションのため
    const usage = sanitizeUsage({ totalTokens: 5 } as any);

    expect(usage).toEqual({ inputTokens: 2, outputTokens: 3, totalTokens: 5 });
  });
});
