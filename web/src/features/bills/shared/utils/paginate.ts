/** 議案一覧（/bills）の1ページあたりの件数。 */
export const BILLS_PER_PAGE = 20;

export type PaginatedItems<T> = {
  items: T[];
  /** 範囲外を丸めたあとの現在ページ（1始まり）。 */
  page: number;
  /** 総ページ数。0件でも1を返す（空の1ページ目を出す）。 */
  totalPages: number;
  /** 表示中の先頭が全体の何件目か（1始まり）。0件なら 0。 */
  from: number;
  /** 表示中の末尾が全体の何件目か。0件なら 0。 */
  to: number;
};

/**
 * 配列を1ページ分に切り出す。
 *
 * 範囲外のページ番号は端に丸める。絞り込みで件数が減ったあとに古いページ番号の
 * URL を開いても、空のページではなく最後のページを出すため。
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  perPage: number
): PaginatedItems<T> {
  if (!Number.isInteger(perPage) || perPage < 1) {
    throw new RangeError(`perPage must be a positive integer: ${perPage}`);
  }

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Number.isFinite(page)
    ? Math.min(Math.max(1, Math.floor(page)), totalPages)
    : 1;
  const start = (current - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  return {
    items: pageItems,
    page: current,
    totalPages,
    from: pageItems.length > 0 ? start + 1 : 0,
    to: start + pageItems.length,
  };
}

/** ページ送りに並べる要素。数字はページ番号、"ellipsis" は省略記号。 */
export type PageLink = number | "ellipsis";

/** 現在ページの前後に出すページ数。 */
const SIBLING_PAGES = 1;

/**
 * ページ送りに並べる番号を決める。
 *
 * 先頭・末尾・現在の前後だけを出し、間は省略記号にする。全ページを並べると
 * 狭い画面で折り返す。省略が1ページ分だけなら、記号ではなくその番号を出す
 * （「…」を押せないのに1ページしか隠れていない、を避ける）。
 */
export function pageLinks(current: number, totalPages: number): PageLink[] {
  if (totalPages < 1) return [];

  const pages = new Set([1, totalPages]);
  for (
    let page = current - SIBLING_PAGES;
    page <= current + SIBLING_PAGES;
    page++
  ) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  const links: PageLink[] = [];
  let previous = 0;
  for (const page of [...pages].sort((a, b) => a - b)) {
    if (page - previous === 2) {
      links.push(previous + 1);
    } else if (page - previous > 2) {
      links.push("ellipsis");
    }
    links.push(page);
    previous = page;
  }

  return links;
}
