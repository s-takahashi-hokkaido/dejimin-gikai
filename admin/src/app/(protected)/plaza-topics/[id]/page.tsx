import { requirePageAccess } from "@/features/auth/server/lib/auth-server";
import { TopicDetailPage } from "@/features/plaza-topics/server/components/topic-detail-page";
import { notFoundUnlessPlazaEnabled } from "@/features/plaza-topics/server/lib/plaza-access";

interface PlazaTopicPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlazaTopicPage({ params }: PlazaTopicPageProps) {
  notFoundUnlessPlazaEnabled();
  const admin = await requirePageAccess("/plaza-topics/[id]");
  const { id } = await params;
  return <TopicDetailPage actor={admin} topicId={id} />;
}
