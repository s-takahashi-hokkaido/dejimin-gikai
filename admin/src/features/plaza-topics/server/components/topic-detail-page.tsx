import "server-only";
import { ArrowLeft, MessagesSquare, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DeleteTopicButton } from "../../client/components/delete-topic-button";
import { TopicMarkdown } from "../../client/components/topic-markdown";
import { TopicStatusBadge } from "../../client/components/topic-status-badge";
import { buildTopicDateRows } from "../../shared/utils/build-topic-date-rows";
import { formatTopicAuthor } from "../../shared/utils/format-topic-author";
import {
  canDeleteTopic,
  canEditTopic,
  isOwnTopic,
  type TopicActor,
} from "../../shared/utils/topic-permissions";
import { loadViewableTopic } from "../loaders/load-plaza-topics";
import {
  loadTopicInterviewConfigSummary,
  type TopicInterviewConfigSummary,
} from "../loaders/load-topic-interview-config-summary";

function describeInterviewConfig(
  summary: TopicInterviewConfigSummary | null
): string {
  if (!summary) {
    return "まだありません。オープンするには、インタビューの質問が必要です。";
  }
  const duration =
    summary.estimatedDuration !== null
      ? `・目安 ${summary.estimatedDuration}分`
      : "";
  return `テーマ ${summary.themesCount}件・質問 ${summary.questionsCount}件${duration}`;
}

/** 議題の詳細。見てはいけない議題（ほかの人の下書き）は、無い議題と同じく 404 にする */
export async function TopicDetailPage({
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

  const interviewConfig = await loadTopicInterviewConfigSummary(topic.id);
  const canEdit = canEditTopic(actor, topic);
  // 設定の画面と Server Action でも同じ判定をする。ここは導線を出すかどうかだけ
  const canEditInterviewConfig =
    canEdit && !(interviewConfig?.hasResponses ?? false);
  const canDelete = canDeleteTopic(actor, topic);
  const isOwnDraft = topic.status === "draft" && isOwnTopic(actor, topic);

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

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <TopicStatusBadge status={topic.status} />
          <h1 className="mt-2 break-words text-2xl font-bold text-gray-900">
            {topic.title}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            作成者: {formatTopicAuthor(topic.author)}
          </p>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex shrink-0 items-center gap-2">
            {canEdit && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/plaza-topics/${topic.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  編集
                </Link>
              </Button>
            )}
            {canDelete && (
              <DeleteTopicButton topicId={topic.id} title={topic.title} />
            )}
          </div>
        )}
      </div>

      {isOwnDraft && (
        <p className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          この議題は下書きです。ほかの議員・出馬者や来訪者には見えません（運営者は閲覧できます）。
        </p>
      )}

      <dl className="mb-6 grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {buildTopicDateRows(topic).map((row) => (
          <div key={row.label} className="flex gap-2">
            <dt className="text-gray-500">{row.label}</dt>
            <dd className="text-gray-900">
              <time dateTime={row.dateTime}>{row.value}</time>
            </dd>
          </div>
        ))}
      </dl>

      <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900">インタビュー設定</h2>
          <p className="mt-1 text-sm text-gray-600">
            {describeInterviewConfig(interviewConfig)}
          </p>
        </div>
        {canEditInterviewConfig && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/plaza-topics/${topic.id}/interview`}>
              <MessagesSquare className="h-4 w-4" />
              {interviewConfig
                ? "インタビュー設定を編集"
                : "インタビュー設定を作る"}
            </Link>
          </Button>
        )}
      </section>

      <section
        aria-label="本文"
        className="rounded-lg border bg-white p-4 sm:p-6"
      >
        {topic.bodyMd.trim() ? (
          <TopicMarkdown markdown={topic.bodyMd} />
        ) : (
          <p className="text-sm text-gray-500">本文はまだありません。</p>
        )}
      </section>
    </div>
  );
}
