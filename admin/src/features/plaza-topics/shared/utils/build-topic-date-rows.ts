import { formatJstDateTime } from "@/lib/utils/format-jst-date-time";
import type { PlazaTopic } from "../types/plaza-topic";

export type TopicDateRow = {
  label: string;
  value: string;
  dateTime: string;
};

/** 議題の詳細に出す日時。その状態で決まっている日時だけを、出来事の順に並べる */
export function buildTopicDateRows(
  topic: Pick<
    PlazaTopic,
    "createdAt" | "updatedAt" | "openedAt" | "closesAt" | "closedAt"
  >
): TopicDateRow[] {
  const rows: { label: string; dateTime: string | null }[] = [
    { label: "作成日時", dateTime: topic.createdAt },
    { label: "更新日時", dateTime: topic.updatedAt },
    { label: "オープン日時", dateTime: topic.openedAt },
    // クローズした後は期限より実際にクローズした日時が意味を持つので、期限は出さない
    {
      label: "自動クローズの期限",
      dateTime: topic.closedAt ? null : topic.closesAt,
    },
    { label: "クローズ日時", dateTime: topic.closedAt },
  ];

  return rows.flatMap(({ label, dateTime }) =>
    dateTime ? [{ label, dateTime, value: formatJstDateTime(dateTime) }] : []
  );
}
