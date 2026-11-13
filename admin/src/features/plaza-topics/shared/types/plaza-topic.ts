import type { Database } from "@dejimin-gikai/supabase";
import type { AdminRole } from "@/features/auth/shared/utils/role";

/** 議題の状態（下書き → オープン → クローズ。逆には戻れない） */
export const TOPIC_STATUSES = ["draft", "open", "closed"] as const;

export type TopicStatus = (typeof TOPIC_STATUSES)[number];

type InterviewTopicRow =
  Database["public"]["Tables"]["interview_topics"]["Row"];

/**
 * DB から読んだ議題の行（作成者の現在のプロフィールを結合したもの）
 *
 * `author` は作成者の現在の admin_profiles。アカウントを削除すると null になる。
 */
export type PlazaTopicRow = InterviewTopicRow & {
  author: {
    display_name: string;
    role: string;
    faction: { display_name: string } | null;
  } | null;
};

/** 画面に出す作成者 */
export type TopicAuthor = {
  displayName: string;
  /** 既知のロールでなければ null */
  role: AdminRole | null;
  /** 会派の表示名。出馬者は null */
  factionName: string | null;
};

/** 管理画面で扱う議題 */
export type PlazaTopic = {
  id: string;
  /** 作成者のユーザーID。アカウントを削除すると null */
  authorUserId: string | null;
  title: string;
  bodyMd: string;
  status: TopicStatus;
  openedAt: string | null;
  closesAt: string | null;
  closedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** 表示する作成者。null は作成者不明（アカウントを削除した人の下書き） */
  author: TopicAuthor | null;
};

/** 議題の作成・編集フォームの入力（サーバーで確かめてから DB に入れる） */
export type TopicInput = {
  title: string;
  bodyMd: string;
};

export type UpdateTopicInput = TopicInput & {
  id: string;
};

export type TopicIdInput = {
  id: string;
};

export type TopicActionResult = { success: true } | { error: string };

export type CreateTopicResult =
  | { success: true; id: string }
  | { error: string };
