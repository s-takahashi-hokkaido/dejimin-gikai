import type { BillStatusEnum } from "../types";

/** カード用の簡略化されたステータスラベルを取得 */
export function getCardStatusLabel(status: BillStatusEnum): string {
  switch (status) {
    case "submitted":
    case "in_committee":
    case "plenary_session":
      return "議会審議中";
    case "approved":
      return "可決";
    case "rejected":
      return "否決";
    case "adopted":
      return "採択";
    case "partially_adopted":
      return "趣旨採択";
    case "reported":
      return "専決処分報告";
    default:
      return "議案上程前";
  }
}

/** ステータスに対応するBadgeのvariantを取得 */
export function getStatusVariant(
  status: BillStatusEnum
): "light" | "default" | "dark" | "muted" {
  switch (status) {
    case "submitted":
    case "in_committee":
    case "plenary_session":
      return "light";
    case "approved":
    case "adopted":
    case "partially_adopted":
    case "reported":
      return "default";
    case "rejected":
      return "dark";
    default:
      return "muted";
  }
}

/**
 * 議案種別ごとの結果の言い方（決算は「認定」、人事は「同意」、専決処分は「承認」）。
 * DB の status は approved / rejected に畳んでいるので、表示の時だけ言い換える
 */
const RESULT_LABELS_BY_BILL_TYPE: Record<
  string,
  { approved: string; rejected: string }
> = {
  bill_settlement: { approved: "認定", rejected: "不認定" },
  bill_personnel: { approved: "同意", rejected: "不同意" },
  bill_ratification: { approved: "承認", rejected: "不承認" },
};

/**
 * 議案種別に合わせた結果のラベルを返す。言い換えが無い場合は null
 */
export function getResultLabelForBillType(
  status: BillStatusEnum,
  billType: string | null | undefined
): string | null {
  if (status !== "approved" && status !== "rejected") return null;
  if (!billType) return null;
  return RESULT_LABELS_BY_BILL_TYPE[billType]?.[status] ?? null;
}
