import { requirePageAccess } from "@/features/auth/server/lib/auth-server";
import { TopicCreatePage } from "@/features/plaza-topics/server/components/topic-create-page";
import { notFoundUnlessPlazaEnabled } from "@/features/plaza-topics/server/lib/plaza-access";

export default async function NewPlazaTopicPage() {
  notFoundUnlessPlazaEnabled();
  await requirePageAccess("/plaza-topics/new");
  return <TopicCreatePage />;
}
