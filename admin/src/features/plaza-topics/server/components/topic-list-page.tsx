import "server-only";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatJstDateTime } from "@/lib/utils/format-jst-date-time";
import { TopicStatusBadge } from "../../client/components/topic-status-badge";
import type { PlazaTopicSummary } from "../../shared/types/plaza-topic";
import type { TopicGroup } from "../../shared/utils/build-topic-list";
import { formatTopicAuthor } from "../../shared/utils/format-topic-author";
import { TOPIC_STATUS_LABELS } from "../../shared/utils/topic-status";
import {
  canCreateTopic,
  type TopicActor,
} from "../../shared/utils/topic-permissions";
import { loadTopicListSections } from "../loaders/load-plaza-topics";

/** 一覧の1件に出す日時（状態ごとに、いちばん気にする日時） */
function describeTopicDate(topic: PlazaTopicSummary): string {
  switch (topic.status) {
    case "open":
      return `自動クローズの期限: ${formatJstDateTime(topic.closesAt)}`;
    case "closed":
      return `クローズ: ${formatJstDateTime(topic.closedAt)}`;
    default:
      return `更新: ${formatJstDateTime(topic.updatedAt)}`;
  }
}

function TopicListItem({
  topic,
  showAuthor,
}: {
  topic: PlazaTopicSummary;
  showAuthor: boolean;
}) {
  return (
    <li className="rounded-lg border bg-white p-4 transition-colors hover:border-gray-300">
      <div className="flex items-center gap-2">
        <TopicStatusBadge status={topic.status} />
      </div>
      <Link
        href={`/plaza-topics/${topic.id}`}
        className="mt-2 block break-words font-semibold text-gray-900 hover:underline"
      >
        {topic.title}
      </Link>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        {showAuthor && <span>作成者: {formatTopicAuthor(topic.author)}</span>}
        <span>{describeTopicDate(topic)}</span>
      </div>
    </li>
  );
}

function TopicGroups({
  groups,
  showAuthor,
  emptyMessage,
}: {
  groups: TopicGroup[];
  showAuthor: boolean;
  emptyMessage: string;
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.status}>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {TOPIC_STATUS_LABELS[group.status]}（{group.topics.length}件）
          </h3>
          <ul className="space-y-2">
            {group.topics.map((topic) => (
              <TopicListItem
                key={topic.id}
                topic={topic}
                showAuthor={showAuthor}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * 議題の一覧
 *
 * 議員・出馬者には「自分の議題」と「ほかの人の議題（オープン中・クローズ済み）」を分けて出す。
 * 運営者は議題を出さないので「全員の議題」だけを、下書きも含めて出す。
 * どちらも状態別・更新の新しい順に整理する（K5。来訪者向けの web と違い、ランダムにしない）。
 */
export async function TopicListPage({ actor }: { actor: TopicActor }) {
  const sections = await loadTopicListSections(actor);
  const canCreate = canCreateTopic(actor.role);
  const showOwnSection = canCreate || sections.own.length > 0;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AIインタビュー広場</h1>
          <p className="mt-1 text-gray-600">
            議員・出馬者が市民に問いを出し、AIインタビューで声を集めます。
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/plaza-topics/new">
              <Plus className="h-4 w-4" />
              議題を作成
            </Link>
          </Button>
        )}
      </div>

      <div className="space-y-8">
        {showOwnSection && (
          <section className="rounded-lg border bg-gray-50 p-4 sm:p-6">
            <h2 className="text-lg font-semibold">自分の議題</h2>
            <p className="mb-4 mt-1 text-sm text-gray-600">
              下書きは、ほかの議員・出馬者や来訪者には見えません。
            </p>
            <TopicGroups
              groups={sections.own}
              showAuthor={false}
              emptyMessage="まだ議題はありません。「議題を作成」から下書きを作れます。"
            />
          </section>
        )}

        <section className="rounded-lg border bg-gray-50 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">
            {canCreate ? "ほかの人の議題" : "全員の議題"}
          </h2>
          <p className="mb-4 mt-1 text-sm text-gray-600">
            {canCreate
              ? "ほかの議員・出馬者が公開した、オープン中とクローズ済みの議題です。"
              : "議員・出馬者の議題です。下書きも含みます。運営者は議題を作成・編集できません。"}
          </p>
          <TopicGroups
            groups={sections.others}
            showAuthor
            emptyMessage="まだ議題はありません。"
          />
        </section>
      </div>
    </div>
  );
}
