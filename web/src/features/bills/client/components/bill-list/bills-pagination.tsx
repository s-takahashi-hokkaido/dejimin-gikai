import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { pageLinks } from "../../../shared/utils/paginate";

/**
 * 議案一覧のページ送り。
 *
 * 絞り込みと同じくリンクで完結させる。ページ番号も URL に載るので、共有した
 * URL や戻る操作で同じページが開く。
 *
 * 送れない向きの矢印は消さずに薄くする。端で矢印が消えると、番号の並びが
 * 左右にずれて押そうとした番号の位置が変わる。
 */
export function BillsPagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  /** ページ番号からリンク先を作る。絞り込みの状態は呼び出し側が持つ。 */
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="ページ送り" className="mt-6 flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          {page > 1 ? (
            <Link
              href={hrefForPage(page - 1)}
              aria-label="前のページ"
              className={`${PAGE_ITEM} border-mirai-border bg-white text-mirai-text hover:bg-mirai-surface`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span
              aria-hidden
              className={`${PAGE_ITEM} border-mirai-border bg-white text-mirai-text-placeholder`}
            >
              <ChevronLeft className="h-4 w-4" />
            </span>
          )}
        </li>

        {pageLinks(page, totalPages).map((link, index) =>
          link === "ellipsis" ? (
            <li
              // 省略記号は最大2つで、前後のページ番号の間にしか出ない
              // biome-ignore lint/suspicious/noArrayIndexKey: 位置でしか区別できない
              key={`ellipsis-${index}`}
              aria-hidden
              className="flex h-9 w-6 items-end justify-center pb-2 text-[13px] text-mirai-text-muted"
            >
              …
            </li>
          ) : (
            <li key={link}>
              {link === page ? (
                <span
                  aria-current="page"
                  className={`${PAGE_ITEM} border-transparent bg-mirai-gradient text-mirai-text`}
                >
                  {link}
                </span>
              ) : (
                <Link
                  href={hrefForPage(link)}
                  aria-label={`${link}ページ目`}
                  className={`${PAGE_ITEM} border-mirai-border bg-white text-mirai-text hover:bg-mirai-surface`}
                >
                  {link}
                </Link>
              )}
            </li>
          )
        )}

        <li>
          {page < totalPages ? (
            <Link
              href={hrefForPage(page + 1)}
              aria-label="次のページ"
              className={`${PAGE_ITEM} border-mirai-border bg-white text-mirai-text hover:bg-mirai-surface`}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span
              aria-hidden
              className={`${PAGE_ITEM} border-mirai-border bg-white text-mirai-text-placeholder`}
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

/** ページ番号と矢印で共通の寸法。番号が2桁になっても幅だけが伸びる。 */
const PAGE_ITEM =
  "flex h-9 min-w-9 items-center justify-center rounded-full border px-2 font-lexend text-[13px] font-bold";
