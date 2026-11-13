import { describe, expect, it } from "vitest";
import { isDailyBudgetExhausted } from "./is-daily-budget-exhausted";

describe("isDailyBudgetExhausted", () => {
  it("上限未満なら使える", () => {
    expect(isDailyBudgetExhausted(0, 1)).toBe(false);
    expect(isDailyBudgetExhausted(0.999999, 1)).toBe(false);
  });

  it("上限ちょうど・超えたら使えない", () => {
    expect(isDailyBudgetExhausted(1, 1)).toBe(true);
    expect(isDailyBudgetExhausted(1.5, 1)).toBe(true);
  });
});
