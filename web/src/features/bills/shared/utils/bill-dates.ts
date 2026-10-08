import { getJstDateParts } from "@/lib/utils/date";

type BillDateFields = {
  submitted_date?: string | null;
  decided_date?: string | null;
  published_at?: string | null;
};

/**
 * 「提出」として表示する日付を返す。
 *
 * submitted_date（議会への提出年月日）が無い議案は、これまでどおり published_at を
 * 提出日として扱う。札幌市の議案は published_at に本会議提出日を入れてきたため、
 * submitted_date を入れる前の議案も表示が変わらない。
 */
export function resolveSubmittedDate(bill: BillDateFields): string | null {
  return bill.submitted_date ?? bill.published_at ?? null;
}

/**
 * 議決年月日を返す。未議決なら null（published_at にはフォールバックしない）。
 */
export function resolveDecidedDate(bill: BillDateFields): string | null {
  return bill.decided_date ?? null;
}

/**
 * 並び替え用の提出日キー（日本時間の "YYYY-MM-DD"）。日付が無ければ null。
 *
 * submitted_date（date 型）と published_at（timestamptz）が混ざっても、
 * 同じ日なら同じキーになるよう日単位にそろえる。
 */
export function submittedDateSortKey(bill: BillDateFields): string | null {
  const date = resolveSubmittedDate(bill);
  if (!date) return null;
  const parts = getJstDateParts(date);
  if (!parts) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}
