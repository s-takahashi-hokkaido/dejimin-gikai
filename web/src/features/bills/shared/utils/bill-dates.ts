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
 * DB の生成列 submitted_on（submitted_date、無ければ published_at の日本時間の日付）が
 * あればそれを使い、無ければ同じ規則でここで求める。date 型の submitted_date と
 * timestamptz の published_at が混ざっても、同じ日なら同じキーになる。
 *
 * 並び替えの比較ごとに呼ばれるので、Intl を使わずに求める
 * （日本は夏時間が無いので、UTC に 9 時間足せば日本時間の日付になる）。
 */
export function submittedDateSortKey(
  bill: BillDateFields & { submitted_on?: string | null }
): string | null {
  if (bill.submitted_on) return bill.submitted_on;
  const date = resolveSubmittedDate(bill);
  if (!date) return null;
  if (DATE_ONLY_PATTERN.test(date)) return date;
  const time = Date.parse(date);
  if (Number.isNaN(time)) return null;
  return new Date(time + JST_OFFSET_MS).toISOString().slice(0, 10);
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
