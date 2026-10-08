import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { getDifficultyLevel } from "@/features/bill-difficulty/server/loaders/get-difficulty-level";
import { getCouncilSessionBySlug } from "@/features/council-sessions/server/loaders/get-council-session-by-slug";
import { getBudgetOverviewDetail } from "@/features/budget-overview/server/loaders/get-budget-overview-detail";
import { BudgetOverviewDetail } from "@/features/budget-overview/server/components/budget-overview-detail";
import { BudgetThemeAccordion } from "@/features/budget-overview/client/components/budget-theme-accordion";
import { BudgetChatClient } from "@/features/budget-overview/client/components/budget-chat-client";
import { getFiscalYearLabel } from "@/features/budget-overview/shared/utils/fiscal-year-label";
import { siteConfig } from "@/config/site.config";

interface BudgetDetailPageProps {
  params: Promise<{
    session_slug: string;
    department_slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: BudgetDetailPageProps): Promise<Metadata> {
  const { session_slug, department_slug } = await params;

  const session = await getCouncilSessionBySlug(session_slug);
  if (!session) return { title: "会期が見つかりません" };

  const overview = await getBudgetOverviewDetail(session.id, department_slug);
  if (!overview) return { title: "予算概要が見つかりません" };

  return {
    title: `${overview.department_name} 重点施策 | ${session.name}`,
    description:
      overview.direction ??
      `${session.name} ${overview.department_name}の重点施策と予算概要`,
  };
}

export default async function BudgetDetailPage({
  params,
}: BudgetDetailPageProps) {
  const { session_slug, department_slug } = await params;

  const [session, currentDifficulty] = await Promise.all([
    getCouncilSessionBySlug(session_slug),
    getDifficultyLevel(),
  ]);
  if (!session) {
    notFound();
  }

  const overview = await getBudgetOverviewDetail(session.id, department_slug);
  if (!overview) {
    notFound();
  }

  return (
    <Container className="py-10 pb-28">
      <BudgetOverviewDetail
        overview={overview}
        sessionSlug={session_slug}
        fiscalYearLabel={getFiscalYearLabel(session.name)}
      />

      <div>
        <h2 className="text-lg font-bold text-mirai-text mb-4">
          重点施策・テーマ
        </h2>
        <BudgetThemeAccordion themes={overview.themes} />
      </div>

      {siteConfig.features.aiChat && (
        <BudgetChatClient
          currentDifficulty={currentDifficulty}
          budget={{
            departmentName: overview.department_name,
            direction: overview.direction,
            totalBudget: overview.total_budget,
            themes: overview.themes.map((t) => ({
              title: t.title,
              aiSummary: t.ai_summary,
              initiatives: t.initiatives.map((i) => ({
                title: i.title,
                description: i.description,
              })),
            })),
          }}
        />
      )}
    </Container>
  );
}
