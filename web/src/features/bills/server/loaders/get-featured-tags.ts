import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { BillTag } from "../../shared/types";
import { findFeaturedTags } from "../repositories/bill-repository";

/**
 * 絞り込みに出すタグ。featured_priority を持つタグを優先度順に返す。
 *
 * 運用途中のタグが議案に付いていても、カテゴリとして選べるのは featured だけに
 * する。議案からタグを集めると、選べるカテゴリが際限なく増える。
 */
export async function getFeaturedTags(): Promise<BillTag[]> {
  try {
    return await _getCachedFeaturedTags();
  } catch (error) {
    // 取得失敗はキャッシュ関数の外で受ける。一覧はカテゴリ無しでも使えるので
    // 空に縮退させる。
    console.error("Failed to fetch featured tags:", error);
    return [];
  }
}

const _getCachedFeaturedTags = unstable_cache(
  async (): Promise<BillTag[]> => {
    const tags = await findFeaturedTags();

    // 取得失敗をキャッシュに載せない。空配列を通すと、一時的なDBエラー1回で
    // 絞り込みの導線が最大10分消えたままになる。例外はキャッシュされない。
    if (tags === null) {
      throw new Error("Failed to fetch featured tags");
    }

    return tags.map((tag) => ({ id: tag.id, label: tag.label }));
  },
  ["featured-tags"],
  { revalidate: 600, tags: [CACHE_TAGS.BILLS] }
);
