import { describe, expect, it } from "vitest";
import {
  calculateTokenCostUsd,
  getJstDayRange,
  MODEL_PRICING,
  parseCostLimitUsd,
  roundCost,
} from "./cost";
import { AI_MODELS } from "./models";

describe("calculateTokenCostUsd", () => {
  it("入力と出力のトークン数から計算する", () => {
    // gpt-5.2: 入力 $1.75 / 出力 $14（100万トークンあたり）
    expect(
      calculateTokenCostUsd(AI_MODELS.gpt5_2, {
        inputTokens: 10_000,
        outputTokens: 1_000,
      })
    ).toBe(0.0315);
  });

  it("料金の分からないモデルは null", () => {
    expect(
      calculateTokenCostUsd("unknown-model", {
        inputTokens: 1,
        outputTokens: 1,
      })
    ).toBeNull();
  });

  it("すべてのモデルに料金がある", () => {
    for (const model of Object.values(AI_MODELS)) {
      expect(MODEL_PRICING[model], model).toBeDefined();
    }
  });
});

describe("roundCost", () => {
  it("小数6桁に丸め、0以下は0にする", () => {
    expect(roundCost(0.12345678)).toBe(0.123457);
    expect(roundCost(-1)).toBe(0);
    expect(roundCost(Number.NaN)).toBe(0);
  });
});

describe("getJstDayRange", () => {
  it("JST の0時から24時間を UTC で返す", () => {
    expect(getJstDayRange(new Date("2026-09-12T16:00:00.000Z"))).toEqual({
      from: "2026-09-12T15:00:00.000Z",
      to: "2026-09-13T15:00:00.000Z",
    });
  });
});

describe("parseCostLimitUsd", () => {
  it("未設定ならフォールバック、不正なら null", () => {
    expect(parseCostLimitUsd(undefined, 1)).toBe(1);
    expect(parseCostLimitUsd("0.5", 1)).toBe(0.5);
    expect(parseCostLimitUsd("abc", 1)).toBeNull();
    expect(parseCostLimitUsd("0", 1)).toBeNull();
  });
});
