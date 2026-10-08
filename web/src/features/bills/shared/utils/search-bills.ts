import type { BillTag } from "../types";

/**
 * 検索に必要な最小の形。実際に読む項目だけを要求する。
 *
 * `BillWithContent` に固定すると `bill_content` にDBの行がまるごと必要に
 * なり、候補表示のように要約を持たない軽い形を渡せない。
 */
export type SearchableBill = {
  name: string;
  /** 議案番号（例: 「議案第1号」）。番号を持たない形も渡せるよう任意にする。 */
  bill_number?: string | null;
  bill_content?: { title?: string | null; summary?: string | null };
  tags: readonly Pick<BillTag, "label">[];
};

/**
 * 議案のキーワード検索（部分一致）。
 *
 * 正式名称・議案番号・わかりやすいタイトル・要約・タグ名を対象にする。
 * 利用者は「敬老パス」のような通称や「子育て」のようなカテゴリ名でも探すため、
 * 正式名称だけに当てると引っかからない。市の資料を見て「議案第12号」のように
 * 番号で探す人もいるので、番号も当てる。
 *
 * 空クエリは絞り込まない（一覧の初期表示が全件になる）。検索ビューが
 * 独立している admin の意見検索とは違い、ここは一覧そのものなので
 * クエリ無しで全件を出すのが自然。
 */
export function searchBills<T extends SearchableBill>(
  bills: readonly T[],
  query: string
): T[] {
  const needle = normalize(query);
  if (!needle) return [...bills];

  return bills.filter((bill) =>
    [
      bill.name,
      bill.bill_number,
      bill.bill_content?.title,
      bill.bill_content?.summary,
      ...bill.tags.map((tag) => tag.label),
    ].some((field) => field && normalize(field).includes(needle))
  );
}

/**
 * 比較用に正規化する。
 *
 * 全角英数と半角を同一視し、大小文字とスペースの差を無視する。「AI」を
 * 「ＡＩ」と、「12」を「１２」と打つ利用者を取りこぼさないため。
 */
function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}
