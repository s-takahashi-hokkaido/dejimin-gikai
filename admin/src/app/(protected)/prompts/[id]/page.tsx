import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRoleOrRedirect } from "@/features/auth/server/lib/auth-server";
import { ADMIN_ONLY } from "@/features/auth/shared/utils/role";
import { PromptEditor } from "@/features/prompts/client/components/prompt-editor";
import { PromptVersionList } from "@/features/prompts/client/components/prompt-version-list";
import { loadPromptDetail } from "@/features/prompts/server/loaders/load-prompts";

interface PromptDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PromptDetailPage({
  params,
}: PromptDetailPageProps) {
  await requireRoleOrRedirect(ADMIN_ONLY);

  const { id } = await params;
  const prompt = await loadPromptDetail(id);

  if (!prompt) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <Link
        href="/prompts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        プロンプト一覧へ
      </Link>
      <h1 className="text-2xl font-bold font-mono mb-2">{prompt.name}</h1>
      {prompt.description && (
        <p className="mb-8 text-sm text-gray-600">{prompt.description}</p>
      )}

      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">
          編集
          {prompt.activeVersion && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              版 {prompt.activeVersion.version} をもとに編集
            </span>
          )}
        </h2>
        <PromptEditor
          // 版が切り替わったら、その版の本文で編集し直す
          key={prompt.activeVersion?.id ?? "none"}
          promptId={prompt.id}
          activeContent={prompt.activeVersion?.content ?? ""}
        />
      </section>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">版の履歴</h2>
        <PromptVersionList promptId={prompt.id} versions={prompt.versions} />
      </section>
    </div>
  );
}
