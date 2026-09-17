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
