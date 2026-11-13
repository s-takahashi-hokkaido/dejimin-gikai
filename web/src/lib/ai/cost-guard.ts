/**
 * AI利用コストのガードに関する純粋関数
 *
 * DBアクセスや環境変数の読み取りを含まないため、単体テストが容易。
 */

/** コスト上限に到達した理由 */
export type CostLimitReason = "per_user" | "global";

/** コスト上限の判定結果 */
export type CostGuardResult =
  | { allowed: true }
  | { allowed: false; reason: CostLimitReason };

export type EvaluateCostGuardParams = {
  /** 対象ユーザーが当日使用した金額(USD) */
  perUserUsedUsd: number;
  /** 対象ユーザーの1日あたり上限(USD) */
  perUserLimitUsd: number;
  /** サイト全体で当日使用した金額(USD) */
  globalUsedUsd: number;
  /** サイト全体の1日あたり上限(USD) */
  globalLimitUsd: number;
};

/**
 * 当日のコスト実績が上限内かどうかを判定する
 *
 * 全体上限を先に評価する。匿名認証ではユーザーを無限に作り直せるため、
 * ユーザー単位の上限だけでは総額を抑えられない。
 */
export function evaluateCostGuard({
  perUserUsedUsd,
  perUserLimitUsd,
  globalUsedUsd,
  globalLimitUsd,
}: EvaluateCostGuardParams): CostGuardResult {
  if (globalUsedUsd >= globalLimitUsd) {
    return { allowed: false, reason: "global" };
  }

  if (perUserUsedUsd >= perUserLimitUsd) {
    return { allowed: false, reason: "per_user" };
  }

  return { allowed: true };
}

// JST の1日の範囲と、コスト上限の環境変数のパースは admin でも使うので packages/shared に置いている
export {
  getJstDayRange,
  parseCostLimitUsd,
} from "@dejimin-gikai/shared/ai/cost";
