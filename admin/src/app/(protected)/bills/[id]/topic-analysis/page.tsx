import { requirePageAccess } from "@/features/auth/server/lib/auth-server";
import { TopicAnalysisPageContent } from "@/features/topic-analysis/server/components/topic-analysis-page";

interface TopicAnalysisPageProps {
  params: Promise<{ id: string }>;
}

export default async function TopicAnalysisPage({
  params,
}: TopicAnalysisPageProps) {
  const admin = await requirePageAccess("/bills/[id]/topic-analysis");
  const { id } = await params;
  return (
    <TopicAnalysisPageContent
      billId={id}
      canRunAnalysis={admin.role === "admin"}
    />
  );
}
