import { ROLE_LABELS } from "@/features/auth/shared/utils/role";
import type { TopicAuthor } from "../types/plaza-topic";

/** 作成者のアカウントを削除した下書きの表示 */
export const UNKNOWN_TOPIC_AUTHOR_LABEL = "作成者不明（アカウント削除済み）";

/**
 * 作成者を「名前（会派）」の形で表示する。出馬者は会派の代わりにロールを出す
 *
 * 議題を出す画面では作成者を必ず出す（設計思想 2-2）。
 */
export function formatTopicAuthor(author: TopicAuthor | null): string {
  if (!author) {
    return UNKNOWN_TOPIC_AUTHOR_LABEL;
  }

  const affiliation =
    author.factionName ?? (author.role ? ROLE_LABELS[author.role] : null);
  return affiliation
    ? `${author.displayName}（${affiliation}）`
    : author.displayName;
}
