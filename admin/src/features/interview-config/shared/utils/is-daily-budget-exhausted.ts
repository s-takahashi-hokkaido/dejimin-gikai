/**
 * 1日の利用額が上限に達しているか（上限ちょうども使えない側に倒す）
 */
export function isDailyBudgetExhausted(
  usedUsd: number,
  limitUsd: number
): boolean {
  return usedUsd >= limitUsd;
}
