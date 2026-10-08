import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import { findLatestSessionWithBudget } from "../repositories/budget-repository";

/**
 * 公開済みの予算概要がある最新の会期を取得
 */
export async function getLatestBudgetSession(): Promise<CouncilSession | null> {
  return _getCachedLatestBudgetSession();
}

const _getCachedLatestBudgetSession = unstable_cache(
  async (): Promise<CouncilSession | null> => {
    return findLatestSessionWithBudget();
  },
  ["latest-budget-session"],
  {
    revalidate: 3600,
    tags: [CACHE_TAGS.COUNCIL_SESSIONS],
  }
);
