import "server-only";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TopicForm } from "../../client/components/topic-form";
import {
  canEditTopic,
  type TopicActor,
} from "../../shared/utils/topic-permissions";
import { loadViewableTopic } from "../loaders/load-plaza-topics";

/**
 * 議題の編集
 *
 * 見てはいけない議題は 404。見られても編集できない議題（ほかの人の議題・下書きでない議題）は詳細へ戻す。
 * 保存の Server Action でも同じ判定をするので、ここは導線の整理のため。
 */
export async function TopicEditPage({
  actor,
  topicId,
}: {
  actor: TopicActor;
  topicId: string;
}) {
  const topic = await loadViewableTopic(actor, topicId);
  if (!topic) {
    notFound();
  }
  if (!canEditTopic(actor, topic)) {
    redirect(`/plaza-topics/${topic.id}`);
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link
          href={`/plaza-topics/${topic.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          議題に戻る
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">議題の編集</h1>
      </div>

      <div className="rounded-lg border bg-white p-4 sm:p-6">
        <TopicForm
          mode="edit"
          topic={{ id: topic.id, title: topic.title, bodyMd: topic.bodyMd }}
        />
      </div>
    </div>
  );
}
