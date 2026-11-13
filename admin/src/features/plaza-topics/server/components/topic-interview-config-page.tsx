import "server-only";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { AdminUser } from "@/features/auth/server/lib/auth-server";
import { findInterviewQuestionsByConfigId } from "@/features/interview-config/server/repositories/interview-config-repository";
import { TopicInterviewConfigEditor } from "../../client/components/topic-interview-config-editor";
import { TOPIC_INTERVIEW_DURATION } from "../../shared/utils/topic-interview-config";
import { authorizeTopicInterviewConfigEdit } from "../lib/topic-interview-config-access";

/**
 * 議題のインタビュー設定
 *
 * 見てはいけない議題は 404。見られても変えられない議題（ほかの人の議題・下書きでない議題・回答が始まった議題）は詳細へ戻す。
 * 保存の Server Action と AI 生成の API でも同じ判定をするので、ここは導線の整理のため。
 */
export async function TopicInterviewConfigPage({
  actor,
  topicId,
}: {
  actor: AdminUser;
  topicId: string;
}) {
  const access = await authorizeTopicInterviewConfigEdit(actor, topicId);
  if (!access.ok) {
    if (access.status === 404) {
      notFound();
    }
    redirect(`/plaza-topics/${topicId}`);
  }

  const { topic, config } = access;
  const questions = config
    ? await findInterviewQuestionsByConfigId(config.id)
    : [];

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
        <h1 className="text-2xl font-bold text-gray-900">インタビュー設定</h1>
        <p className="mt-1 break-words text-gray-600">{topic.title}</p>
        <p className="mt-2 text-sm text-gray-600">
          来訪者へのインタビューで、AI
          が扱うテーマと質問を決めます。「AIで設定を生成」で AI
          と対話して作り、テーマと質問の欄で直せます。回答が始まると変更できなくなります。
        </p>
      </div>

      <TopicInterviewConfigEditor
        topicId={topic.id}
        initialThemes={config?.themes ?? []}
        initialEstimatedDuration={
          config?.estimated_duration ?? TOPIC_INTERVIEW_DURATION.default
        }
        questions={questions}
      />
    </div>
  );
}
