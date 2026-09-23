import type { Committee } from "@/features/committees/shared/types";

/**
 * 議案フォームの付託委員会の選択肢を返す。
 * 有効な委員会に加え、無効にした委員会でもその議案に付託済みなら残す
 * （特別委員会は会期ごとに設置・廃止されるため、過去の議案を編集すると外れてしまう）
 */
export function selectCommitteeOptions(
  committees: Committee[],
  selectedIds: string[]
): Committee[] {
  const selected = new Set(selectedIds);
  return committees.filter((c) => c.is_active || selected.has(c.id));
}
