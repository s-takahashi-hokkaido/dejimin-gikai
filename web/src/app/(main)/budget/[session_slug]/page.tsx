import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { getCouncilSessionBySlug } from "@/features/council-sessions/server/loaders/get-council-session-by-slug";
import { findPreviousCouncilSession } from "@/features/council-sessions/server/repositories/council-session-repository";
import { getBudgetOverviews } from "@/features/budget-overview/server/loaders/get-budget-overviews";
import { hasPublishedOverviewsBySession } from "@/features/budget-overview/server/repositories/budget-repository";
import { BudgetOverviewList } from "@/features/budget-overview/server/components/budget-overview-list";
import { BudgetChatClient } from "@/features/budget-overview/client/components/budget-chat-client";
import { getFiscalYearLabel } from "@/features/budget-overview/shared/utils/fiscal-year-label";
import { siteConfig } from "@/config/site.config";

interface BudgetListPageProps {
  params: Promise<{
    session_slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: BudgetListPageProps): Promise<Metadata> {
  const { session_slug } = await params;
  const session = await getCouncilSessionBySlug(session_slug);

  if (!session) {
    return { title: "会期が見つかりません" };
  }

  return {
    title: `${session.name} 各局の重点施策`,
    description: `${session.name}の各局予算の重点施策・方向性をわかりやすく解説します。`,
  };
}

function toFiscalYearLabel(sessionName: string): string {
  const label = getFiscalYearLabel(sessionName);
  return label ? `${label}予算` : sessionName;
}

export default async function BudgetListPage({ params }: BudgetListPageProps) {
  const { session_slug } = await params;

  const [session, currentDifficulty] = await Promise.all([
    getCouncilSessionBySlug(session_slug),
    getDifficultyLevel(),
  ]);
  if (!session) {
    notFound();
  }

  const [overviews, prevSession] = await Promise.all([
    getBudgetOverviews(session.id),
    findPreviousCouncilSession(session.start_date),
  ]);

  // 前回のセッションに budget_overviews があるか確認
  const prevSessionWithBudget = prevSession?.slug
    ? await hasPublishedOverviewsBySession(prevSession.id).then((has) =>
        has ? prevSession : null
      )
    : null;

  return (
    <Container className="py-10 pb-28">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-mirai-text">各局の重点施策</h1>
        <p className="mt-2 text-sm text-mirai-text-secondary">
          {toFiscalYearLabel(session.name)}{" "}
          の各局予算の方向性と主要施策をまとめています。
        </p>
      </div>

      <BudgetOverviewList overviews={overviews} sessionSlug={session_slug} />

      {/* 前年度予算セクション */}
      {prevSessionWithBudget && (
        <div className="mt-12 pt-8 border-t border-mirai-border">
          <h2 className="text-lg font-bold text-mirai-text mb-4">
            前年度の予算
          </h2>
          <Link
            href={`/budget/${prevSessionWithBudget.slug}`}
            className="flex items-center justify-between py-4 px-2 hover:bg-mirai-surface-grouped rounded-lg transition-colors group"
          >
            <span className="font-bold text-mirai-text text-base">
              {prevSessionWithBudget.name}
            </span>
            <ChevronRight className="h-5 w-5 text-mirai-text-muted group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </Link>
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-full"
            >
              <Link href="/budget">さらに前の予算を一覧で表示</Link>
            </Button>
          </div>
        </div>
      )}

      {siteConfig.features.aiChat && overviews.length > 0 && (
        <BudgetChatClient
          currentDifficulty={currentDifficulty}
          budget={{
            departmentName: `${session.name} 各局`,
            themes: overviews.map((o) => ({
              title: o.department_name,
              aiSummary: o.direction,
            })),
          }}
        />
      )}
    </Container>
  );
}
