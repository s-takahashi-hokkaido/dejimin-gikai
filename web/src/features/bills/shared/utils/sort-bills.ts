import { BILL_STATUS_ORDER, type BillStatusEnum } from "../types";
import { submittedDateSortKey } from "./bill-dates";

export const BILL_SORT_KEYS = [
  "voices",
  "new",
  "updated",
  "old",
  "status",
] as const;

export type BillSortKey = (typeof BILL_SORT_KEYS)[number];

export const BILL_SORT_LABELS: Record<BillSortKey, string> = {
  voices: "声が集まっている順",
  new: "提出日が新しい順",
  updated: "更新が新しい順",
  old: "提出日が古い順",
  status: "審議状況順",
};

export const DEFAULT_BILL_SORT: BillSortKey = "new";

/** 文字列を並び順に絞り込む型ガード。URL 直打ちで壊れないようにする。 */
export function isBillSortKey(value: unknown): value is BillSortKey {
  return (
    typeof value === "string" &&
    (BILL_SORT_KEYS as readonly string[]).includes(value)
  );
}

/**
 * 回答数の並び（voices）は AIインタビューの回答を数えるので、インタビューを
 * 使わない設定では選択肢から外す。
 */
export function availableBillSortKeys(
  interviewEnabled: boolean
): readonly BillSortKey[] {
  return interviewEnabled
    ? BILL_SORT_KEYS
    : BILL_SORT_KEYS.filter((key) => key !== "voices");
}

type SortableBill = {
  id: string;
  /** 議案番号（例: 「議案第1号」）。同点の並びを決めるのに使う。 */
  bill_number?: string | null;
  /** 議会への提出年月日。無ければ published_at を提出日として扱う。 */
  submitted_date?: string | null;
  /** submitted_date が無い議案で「提出」日として出している日付。 */
  published_at: string | null;
  updated_at: string;
  status: BillStatusEnum;
  publicReportCount?: number;
};

type Compare = (a: SortableBill, b: SortableBill) => number;

/**
 * 一覧の並び替え。
 *
 * 提出日（submitted_date、無ければ published_at）は null がありうる。日付が無い議案を上位に紛れ込ませると
 * 「新しい順」の意味が壊れるので、昇順・降順のどちらでも最後尾に落とす。
 *
 * 同点は「提出日の新しい順 → 議案番号の順 → id」で必ず決める。定例会ごとに
 * 数十件が同じ提出日を持ち、DB からの取得順は不定なので、決めずにおくと
 * ページをまたいで同じ議案が重複したり抜けたりする。
 */
export function sortBills<T extends SortableBill>(
  bills: readonly T[],
  key: BillSortKey
): T[] {
  return [...bills].sort(PRIMARY_COMPARES[key]);
}

const bySubmittedDate =
  (direction: "asc" | "desc"): Compare =>
  (a, b) => {
    // 提出日は日単位（日本時間）で比べる。date 型の submitted_date と
    // timestamptz の published_at が混ざっても、同じ日なら同点にする。
    const aKey = submittedDateSortKey(a);
    const bKey = submittedDateSortKey(b);
    // 日付なしは常に最後尾。方向を反転させても沈めたままにする。
    if (!aKey && !bKey) return 0;
    if (!aKey) return 1;
    if (!bKey) return -1;

    const diff = aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    return direction === "asc" ? diff : -diff;
  };

/**
 * 議案番号の自然順。「議案第2号」を「議案第10号」より前にする。
 *
 * 種別（議案・請願・報告など）をまたぐ並びは照合順に任せる。並びが毎回
 * 同じであればよく、種別の優先順位までは決めない。
 */
const billNumberCollator = new Intl.Collator("ja", { numeric: true });

const byBillNumber: Compare = (a, b) =>
  billNumberCollator.compare(a.bill_number ?? "", b.bill_number ?? "");

const byId: Compare = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** 先に並べた比較で差が出なければ、次の比較に回す。 */
const chain =
  (...compares: Compare[]): Compare =>
  (a, b) => {
    for (const compare of compares) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };

const PRIMARY_COMPARES: Record<BillSortKey, Compare> = {
  // 回答が無い議案は 0 として最後尾に沈む。
  voices: chain(
    (a, b) => (b.publicReportCount ?? 0) - (a.publicReportCount ?? 0),
    bySubmittedDate("desc"),
    byBillNumber,
    byId
  ),
  new: chain(bySubmittedDate("desc"), byBillNumber, byId),
  old: chain(bySubmittedDate("asc"), byBillNumber, byId),
  updated: chain(
    (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
    bySubmittedDate("desc"),
    byBillNumber,
    byId
  ),
  status: chain(
    (a, b) => BILL_STATUS_ORDER[a.status] - BILL_STATUS_ORDER[b.status],
    bySubmittedDate("desc"),
    byBillNumber,
    byId
  ),
};
