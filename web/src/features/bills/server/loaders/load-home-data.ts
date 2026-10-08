import { siteConfig } from "@/config/site.config";
import { getBillsByFeaturedTags } from "@/features/bills/server/loaders/get-bills-by-featured-tags";
import { getComingSoonBills } from "./get-coming-soon-bills";
import { getFeaturedBills } from "./get-featured-bills";
import { getInterviewOpenBills } from "./get-interview-open-bills";
import { getPreviousSessionBills } from "./get-previous-session-bills";

/**
 * トップページ用のデータを並列取得する
 * BFF (Backend For Frontend) パターン
 */
export async function loadHomeData() {
  const [
    featuredBills,
    billsByTag,
    interviewOpenBills,
    comingSoonBills,
    previousSessionData,
  ] = await Promise.all([
    getFeaturedBills(),
    getBillsByFeaturedTags(),
    // AIインタビューを使わない設定では受付中セクションを出さないので引かない
    siteConfig.features.aiInterview ? getInterviewOpenBills() : [],
    getComingSoonBills(),
    getPreviousSessionBills(),
  ]);

  return {
    billsByTag,
    featuredBills,
    interviewOpenBills,
    comingSoonBills,
    previousSessionData,
  };
}
