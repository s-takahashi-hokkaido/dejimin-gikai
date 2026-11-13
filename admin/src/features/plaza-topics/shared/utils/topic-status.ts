import { TOPIC_STATUSES, type TopicStatus } from "../types/plaza-topic";

/** 状態の表示名 */
export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  draft: "下書き",
  open: "オープン中",
  closed: "クローズ済み",
};

/** DB から読んだ文字列が既知の状態かどうか */
export function isTopicStatus(value: unknown): value is TopicStatus {
  return (
    typeof value === "string" &&
    (TOPIC_STATUSES as readonly string[]).includes(value)
  );
}
