import type { BillStatusEnum } from "../types";

/**
 * 議案一覧のステータス絞り込みで使うグループ。
 *
 * DB の status は9値（preparing / submitted / in_committee / plenary_session /
 * approved / rejected / adopted / partially_adopted / reported）あるが、一覧の
 * タブは5つに束ねる。審議の段階（委員会・本会議）は絞り込みの軸としては細かすぎる
 * ため、まとめて「審議中」にする。
 */
export const BILL_STATUS_GROUPS = [
  "all",
  "deliberating",
  "passed",
  "rejected",
  "other",
] as const;

export type BillStatusGroup = (typeof BILL_STATUS_GROUPS)[number];

export const BILL_STATUS_GROUP_LABELS: Record<BillStatusGroup, string> = {
  all: "すべて",
  deliberating: "審議中",
  passed: "可決・採択",
  rejected: "否決",
  other: "その他",
};

/**
 * status をタブのグループに畳む。
 *
 * 既存の `getCardStatusLabel` と同じ畳み方にする。あちらは上程済み・委員会
 * 審査中・本会議採決中をまとめて「議会審議中」と出すので、ここで分けると、
 * カードに「議会審議中」と出ている議案がタブごとに散らばる。
 *
 * 可決・採択・趣旨採択は、どれも議会が認めた結果なので「可決・採択」に入れる。
 * 決算の「認定」や人事の「同意」も DB では approved なので、ここに入る。
 * 専決処分の報告（採決を伴わない）と上程前は「その他」に寄せる。
 */
export function toBillStatusGroup(
  status: BillStatusEnum
): Exclude<BillStatusGroup, "all"> {
  switch (status) {
    case "submitted":
    case "in_committee":
    case "plenary_session":
      return "deliberating";
    case "approved":
    case "adopted":
    case "partially_adopted":
      return "passed";
    case "rejected":
      return "rejected";
    default:
      return "other";
  }
}

/** 文字列をグループに絞り込む型ガード。URL 直打ちで壊れないようにする。 */
export function isBillStatusGroup(value: unknown): value is BillStatusGroup {
  return (
    typeof value === "string" &&
    (BILL_STATUS_GROUPS as readonly string[]).includes(value)
  );
}

/** グループごとの件数。呼び出し側が渡した母集合をそのまま数える。 */
export function countByStatusGroup(
  bills: readonly { status: BillStatusEnum }[]
): Record<BillStatusGroup, number> {
  const counts: Record<BillStatusGroup, number> = {
    all: bills.length,
    deliberating: 0,
    passed: 0,
    rejected: 0,
    other: 0,
  };
  for (const bill of bills) {
    counts[toBillStatusGroup(bill.status)] += 1;
  }
  return counts;
}

/** グループで絞る。`all` は素通し。 */
export function filterByStatusGroup<T extends { status: BillStatusEnum }>(
  bills: readonly T[],
  group: BillStatusGroup
): T[] {
  if (group === "all") return [...bills];
  return bills.filter((bill) => toBillStatusGroup(bill.status) === group);
}
