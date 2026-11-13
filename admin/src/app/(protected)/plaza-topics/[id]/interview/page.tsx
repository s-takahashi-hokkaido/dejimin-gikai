import { requirePageAccess } from "@/features/auth/server/lib/auth-server";
import { TopicInterviewConfigPage } from "@/features/plaza-topics/server/components/topic-interview-config-page";
import { notFoundUnlessPlazaEnabled } from "@/features/plaza-topics/server/lib/plaza-access";

interface TopicInterviewConfigRouteProps {
  params: Promise<{ id: string }>;
}

export default async function TopicInterviewConfigRoute({
  params,
}: TopicInterviewConfigRouteProps) {
  notFoundUnlessPlazaEnabled();
  const admin = await requirePageAccess("/plaza-topics/[id]/interview");
  const { id } = await params;
  return <TopicInterviewConfigPage actor={admin} topicId={id} />;
}
