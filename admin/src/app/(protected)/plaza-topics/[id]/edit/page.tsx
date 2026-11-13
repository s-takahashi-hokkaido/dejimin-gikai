import { requirePageAccess } from "@/features/auth/server/lib/auth-server";
import { TopicEditPage } from "@/features/plaza-topics/server/components/topic-edit-page";
import { notFoundUnlessPlazaEnabled } from "@/features/plaza-topics/server/lib/plaza-access";

interface EditPlazaTopicPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPlazaTopicPage({
  params,
}: EditPlazaTopicPageProps) {
  notFoundUnlessPlazaEnabled();
  const admin = await requirePageAccess("/plaza-topics/[id]/edit");
  const { id } = await params;
  return <TopicEditPage actor={admin} topicId={id} />;
}
