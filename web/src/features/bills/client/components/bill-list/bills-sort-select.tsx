"use client";

import { useRouter } from "next/navigation";
import {
  type BillsListParams,
  billsListHref,
} from "../../../shared/utils/parse-bills-list-params";
import {
  BILL_SORT_LABELS,
  type BillSortKey,
  isBillSortKey,
} from "../../../shared/utils/sort-bills";

/**
 * 並び替えのセレクト。
 *
 * 他の絞り込みはリンクで完結するが、select は変更を拾って遷移させる必要が
 * あるためここだけクライアントにする。状態は URL にあるので、戻る操作でも
 * 選択が復元される。
 */
export function BillsSortSelect({
  params,
  sortKeys,
}: {
  params: BillsListParams;
  /** 選択肢に出す並び。AIインタビューを使わない設定では回答数の並びを外す。 */
  sortKeys: readonly BillSortKey[];
}) {
  const router = useRouter();

  return (
    <label className="ml-auto flex items-center gap-2">
      <span className="sr-only">並び替え</span>
      <select
        value={params.sort}
        onChange={(event) => {
          const next = event.target.value;
          if (!isBillSortKey(next)) return;
          router.push(billsListHref(params, { sort: next }));
        }}
        className="h-9 rounded-lg border border-mirai-border bg-white px-3 text-[13px] font-medium text-mirai-text"
      >
        {sortKeys.map((key) => (
          <option key={key} value={key}>
            {BILL_SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </label>
  );
}
