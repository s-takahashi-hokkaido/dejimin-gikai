import { Container } from "@/components/layouts/container";
import { About } from "@/components/top/about";
import { GeneralQuestionsBanner } from "@/components/top/general-questions-banner";
import { Hero } from "@/components/top/hero";
import { PastSessionsSection } from "@/components/top/past-sessions-section";
import { siteConfig } from "@/config/site.config";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { BillDisclaimer } from "@/features/bills/client/components/bill-detail/bill-disclaimer";
import { BillSearchOverlay } from "@/features/bills/client/components/bill-search-overlay";
import { BillsByTagSection } from "@/features/bills/server/components/bills-by-tag-section";
import { CategoryTabs } from "@/features/bills/server/components/category-tabs";
import { FeaturedBillSection } from "@/features/bills/server/components/featured-bill-section";
import { InterviewOpenBillSection } from "@/features/bills/server/components/interview-open-bill-section";
import { getFeaturedTags } from "@/features/bills/server/loaders/get-featured-tags";
import { getSuggestableBills } from "@/features/bills/server/loaders/get-suggestable-bills";
import { loadHomeData } from "@/features/bills/server/loaders/load-home-data";
import type { BillWithContent } from "@/features/bills/shared/types";
import { chatBillName } from "@/features/bills/shared/utils/chat-bill-name";
import { pickHomeSections } from "@/features/bills/shared/utils/pick-home-sections";
import { countTagChipItems } from "@/features/bills/shared/utils/tag-chip-items";
import { HomeChatClient } from "@/features/chat/client/components/home-chat-client";
import { CurrentCouncilSession } from "@/features/council-sessions/client/components/current-council-session";
import { getAllPastSessions } from "@/features/council-sessions/server/loaders/get-all-past-sessions";
import { getCurrentCouncilSession } from "@/features/council-sessions/server/loaders/get-current-council-session";
import { getLatestSessionWithQuestions } from "@/features/general-questions/server/loaders/get-latest-session-with-questions";
import { getJapanTime } from "@/lib/utils/date";

/** カテゴリタブの「注目」から飛ばす先。 */
const FEATURED_ANCHOR = "featured";

export default async function Home() {
  // ゆくゆくタグ機能がマージされたらBFFに統合する
  const [
    { billsByTag, featuredBills, interviewOpenBills },
    currentSession,
    currentDifficulty,
    pastSessions,
    latestQuestionsSlug,
    suggestableBills,
    featuredTags,
  ] = await Promise.all([
    loadHomeData(),
    getCurrentCouncilSession(getJapanTime()),
    getDifficultyLevel(),
    getAllPastSessions(),
    getLatestSessionWithQuestions(),
    getSuggestableBills(),
    getFeaturedTags(),
  ]);

  // 注目セクションは会期の開閉に関係なく、注目の議案があれば出す。
  const showFeatured = featuredBills.length > 0;

  const { tagGroups, shownBills, featuredBillIds } = pickHomeSections({
    billsByTag,
    featuredBills,
    interviewOpenBills,
    showFeatured,
  });

  // カテゴリタブとモーダルの件数は全定例会の公開議案から数える。チップの飛び先が
  // /bills で、あちらも全定例会を数えるため、押す前と後で数字が変わらない。
  // 候補用に取得済みの配列をそのまま使うので、集計のためのクエリは増えない。
  const searchTagChips = countTagChipItems(featuredTags, suggestableBills);

  const toBillChatContext = (bill: BillWithContent) => {
    return {
      name: chatBillName(bill),
      summary: bill.bill_content?.summary,
      tags: bill.tags?.map((tag) => tag.label) || [],
      isFeatured: featuredBillIds.has(bill.id),
    };
  };

  return (
    <>
      <Hero />

      {/* 本日の定例会セクション */}
      <CurrentCouncilSession session={currentSession} />

      {/* カテゴリから議案一覧（/bills）へ入る導線と、検索の入口 */}
      <Container>
        <div className="pt-4">
          <CategoryTabs
            tags={searchTagChips}
            featuredAnchor={showFeatured ? FEATURED_ANCHOR : undefined}
          />
        </div>
        {/* キーワードとテーマの両方をモーダルに並べる */}
        <div className="flex justify-end pt-2">
          <BillSearchOverlay tags={searchTagChips} bills={suggestableBills} />
        </div>
      </Container>

      {/* 一般質問バナー */}
      {latestQuestionsSlug && (
        <Container className="pt-3">
          <GeneralQuestionsBanner sessionSlug={latestQuestionsSlug} />
        </Container>
      )}

      {/* 議案一覧セクション */}
      <Container className="">
        <div className="py-10">
          <main className="flex flex-col gap-16">
            {/*
              AIインタビュー受付中セクション。意見を出せる議案を最初に見せる。
              定例会では絞らない（閉会中でも受付中なら案内する）。
            */}
            <InterviewOpenBillSection bills={interviewOpenBills} />

            {/* 注目の議案セクション */}
            {showFeatured && (
              <div id={FEATURED_ANCHOR} className="scroll-mt-28">
                <FeaturedBillSection bills={featuredBills} />
              </div>
            )}

            {/* タグ別議案一覧セクション（上のセクションに出た議案は除く） */}
            <BillsByTagSection billsByTag={tagGroups} />
          </main>
        </div>
      </Container>

      {/* Archive セクション（過去の定例会） */}
      <div className="bg-mirai-surface-muted py-10">
        <Container>
          <PastSessionsSection sessions={pastSessions} />
        </Container>
      </div>

      <Container>
        {/* About（サービス紹介・派生元の表記）セクション */}
        <About />

        {/* 免責事項 */}
        <BillDisclaimer />
      </Container>

      {/* チャット機能 */}
      {siteConfig.features.aiChat && (
        <HomeChatClient
          currentDifficulty={currentDifficulty}
          bills={shownBills.map(toBillChatContext)}
        />
      )}
    </>
  );
}
