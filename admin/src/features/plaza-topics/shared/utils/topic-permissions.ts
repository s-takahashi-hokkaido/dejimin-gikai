import {
  type AdminRole,
  isAllowedRole,
  PLAZA_AUTHOR_ROLES,
} from "@/features/auth/shared/utils/role";
import type { TopicStatus } from "../types/plaza-topic";

/**
 * AIインタビュー広場の議題の権限判定（機能設計 §5-2）
 *
 * Server Action とページの先頭で使う。画面のボタンを消すだけでは、Server Action を直接呼ばれると防げないため。
 */

/** 操作する人 */
export type TopicActor = {
  id: string;
  role: AdminRole;
};

/** 判定に使う議題の情報 */
export type TopicAccessTarget = {
  authorUserId: string | null;
  status: TopicStatus;
};

/**
 * 作成者が編集・削除できる状態
 *
 * 回答が始まる前のオープン中の議題も編集・削除できる（機能設計 §3）が、
 * 「回答が始まったか」の判定と一緒に P3 で足す。それまでは下書きだけ。
 */
const MUTABLE_STATUSES: readonly TopicStatus[] = ["draft"];

/** 議題を出せるロールか（議員と出馬者。運営者は出せない。K3） */
export function canCreateTopic(role: AdminRole): boolean {
  return isAllowedRole(role, PLAZA_AUTHOR_ROLES);
}

/** 自分の議題か。作成者のアカウントが削除された議題は、誰の議題でもない */
export function isOwnTopic(
  actor: TopicActor,
  topic: TopicAccessTarget
): boolean {
  return topic.authorUserId !== null && topic.authorUserId === actor.id;
}

/**
 * 議題を閲覧できるか
 *
 * 運営者は全員の議題を見られる。議員・出馬者は、自分の議題と、ほかの人のオープン中・クローズ済みの議題を見られる。
 * ほかの人の下書きは見えない（K1）。
 */
export function canViewTopic(
  actor: TopicActor,
  topic: TopicAccessTarget
): boolean {
  if (actor.role === "admin") {
    return true;
  }
  if (isOwnTopic(actor, topic)) {
    return true;
  }
  return topic.status !== "draft";
}

/** 作成者として変更（編集・削除）できるか。できなければ理由を返す */
function validateAuthorMutation(
  actor: TopicActor,
  topic: TopicAccessTarget,
  verb: string
): string | null {
  if (!canCreateTopic(actor.role)) {
    return `議題を${verb}できるのは議員と出馬者だけです`;
  }
  if (!isOwnTopic(actor, topic)) {
    return `自分の議題だけ${verb}できます`;
  }
  if (!MUTABLE_STATUSES.includes(topic.status)) {
    return `下書きの議題だけ${verb}できます`;
  }
  return null;
}

/** 議題を編集できるか。できなければ理由を返す（できるなら null） */
export function validateTopicEdit(
  actor: TopicActor,
  topic: TopicAccessTarget
): string | null {
  return validateAuthorMutation(actor, topic, "編集");
}

/** 議題を削除できるか。できなければ理由を返す（できるなら null） */
export function validateTopicDeletion(
  actor: TopicActor,
  topic: TopicAccessTarget
): string | null {
  return validateAuthorMutation(actor, topic, "削除");
}

export function canEditTopic(
  actor: TopicActor,
  topic: TopicAccessTarget
): boolean {
  return validateTopicEdit(actor, topic) === null;
}

export function canDeleteTopic(
  actor: TopicActor,
  topic: TopicAccessTarget
): boolean {
  return validateTopicDeletion(actor, topic) === null;
}
