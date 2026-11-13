import "server-only";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TopicForm } from "../../client/components/topic-form";

/** 議題の作成（下書きとして作る） */
export function TopicCreatePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link
          href="/plaza-topics"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          議題一覧に戻る
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">議題の作成</h1>
        <p className="mt-1 text-gray-600">
          下書きとして保存します。下書きは、ほかの議員・出馬者や来訪者には見えません。
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4 sm:p-6">
        <TopicForm mode="create" />
      </div>
    </div>
  );
}
