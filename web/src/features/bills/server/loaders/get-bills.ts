import { unstable_cache } from "next/cache";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { BillWithContent } from "../../shared/types";
import {
  findBillIdsWithPublicInterview,
  findPublishedBillsWithContents,
} from "../repositories/bill-repository";

export async function getBills(): Promise<BillWithContent[]> {
  // キャッシュ外でcookiesにアクセス
  const difficultyLevel = await getDifficultyLevel();
  return _getCachedBills(difficultyLevel);
}

const _getCachedBills = unstable_cache(
  async (difficultyLevel: DifficultyLevelEnum): Promise<BillWithContent[]> => {
    // タグは議案と一緒に埋め込みで引き、インタビュー状態は一括で引く
    const [data, interviewBillIds] = await Promise.all([
      findPublishedBillsWithContents(difficultyLevel),
      findBillIdsWithPublicInterview(),
    ]);

    const billsWithContent: BillWithContent[] = data.map((item) => {
      const { bill_contents, bills_tags, ...bill } = item;
      return {
        ...bill,
        bill_content: Array.isArray(bill_contents)
          ? bill_contents[0]
          : undefined,
        tags: bills_tags
          .map((link) => link.tags)
          .filter((tag): tag is NonNullable<typeof tag> => tag !== null),
        hasPublicInterview: interviewBillIds.has(item.id),
      };
    });

    return billsWithContent;
  },
  ["bills-list"],
  {
    revalidate: 600, // 10分（600秒）
    tags: [CACHE_TAGS.BILLS, CACHE_TAGS.INTERVIEW_CONFIGS],
  }
);
