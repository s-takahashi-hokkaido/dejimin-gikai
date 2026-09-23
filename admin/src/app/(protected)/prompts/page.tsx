import Link from "next/link";
import { requireRoleOrRedirect } from "@/features/auth/server/lib/auth-server";
import { ADMIN_ONLY } from "@/features/auth/shared/utils/role";
import { loadPrompts } from "@/features/prompts/server/loaders/load-prompts";

export default async function PromptsPage() {
  await requireRoleOrRedirect(ADMIN_ONLY);

  const prompts = await loadPrompts();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">プロンプト管理</h1>
      <p className="mb-8 text-sm text-gray-600">
        AI
        チャットのシステムプロンプト。保存するとデプロイせずに本番へ反映されます。
      </p>

      <section className="rounded-lg border bg-white">
        <ul className="divide-y">
          {prompts.map((prompt) => (
            <li key={prompt.id}>
              <Link
                href={`/prompts/${prompt.id}`}
                className="block p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono font-semibold">{prompt.name}</span>
                  <span className="text-sm text-gray-500">
                    {prompt.activeVersion
                      ? `版 ${prompt.activeVersion}`
                      : "有効な版なし"}
                  </span>
                </div>
                {prompt.description && (
                  <p className="mt-1 text-sm text-gray-600">
                    {prompt.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
