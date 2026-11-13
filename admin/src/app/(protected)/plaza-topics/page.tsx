import { requirePageAccess } from "@/features/auth/server/lib/auth-server";
import { TopicListPage } from "@/features/plaza-topics/server/components/topic-list-page";
import { notFoundUnlessPlazaEnabled } from "@/features/plaza-topics/server/lib/plaza-access";

export default async function PlazaTopicsPage() {
  notFoundUnlessPlazaEnabled();
  const admin = await requirePageAccess("/plaza-topics");
  return <TopicListPage actor={admin} />;
}
