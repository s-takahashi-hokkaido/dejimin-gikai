import { isAdminRole } from "@/features/auth/shared/utils/role";
import type {
  PlazaTopic,
  PlazaTopicRow,
  PlazaTopicSummary,
  PlazaTopicSummaryRow,
  TopicAuthor,
  TopicStatus,
} from "../types/plaza-topic";
import { isTopicStatus } from "./topic-status";

/**
 * 画面に出す作成者を決める
 *
 * - オープン・クローズした議題: オープン時点の写し（K7）。あとで表示名や会派が変わっても、公開した時のまま出す
 * - 下書き: 作成者の現在のプロフィール（下書きには写しが無い）
 * - どちらも無い（アカウントを削除した人の下書き）: null
 */
export function resolveTopicAuthor(
  row: Pick<
    PlazaTopicRow,
    "author_display_name" | "author_role" | "author_faction_name" | "author"
  > & { status: TopicStatus }
): TopicAuthor | null {
  if (row.status !== "draft" && row.author_display_name) {
    return {
      displayName: row.author_display_name,
      role: isAdminRole(row.author_role) ? row.author_role : null,
      factionName: row.author_faction_name,
    };
  }

  if (row.author) {
    return {
      displayName: row.author.display_name,
      role: isAdminRole(row.author.role) ? row.author.role : null,
      factionName: row.author.faction?.display_name ?? null,
    };
  }

  return null;
}

/** 一覧の行を画面で扱う形にする。未知の状態は DB の CHECK 制約で起きないので、来たらエラーにする */
export function toPlazaTopicSummary(
  row: PlazaTopicSummaryRow
): PlazaTopicSummary {
  if (!isTopicStatus(row.status)) {
    throw new Error(`議題の状態が不正です: ${row.status}`);
  }
  const status = row.status;

  return {
    id: row.id,
    authorUserId: row.author_user_id,
    title: row.title,
    status,
    openedAt: row.opened_at,
    closesAt: row.closes_at,
    closedAt: row.closed_at,
    withdrawnAt: row.withdrawn_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: resolveTopicAuthor({ ...row, status }),
  };
}

/** 詳細の行（本文つき）を画面で扱う形にする */
export function toPlazaTopic(row: PlazaTopicRow): PlazaTopic {
  return { ...toPlazaTopicSummary(row), bodyMd: row.body_md };
}
