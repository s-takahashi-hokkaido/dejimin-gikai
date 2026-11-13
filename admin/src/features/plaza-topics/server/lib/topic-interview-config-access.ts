import "server-only";
import type { AdminUser } from "@/features/auth/server/lib/auth-server";
import type { InterviewConfig } from "@/features/interview-config/shared/types";
import {
  findInterviewConfigByTopicId,
  hasInterviewSessionsByConfigId,
} from "@/features/interview-config/server/repositories/interview-config-repository";
import type { PlazaTopic } from "../../shared/types/plaza-topic";
import { validateTopicInterviewConfigEdit } from "../../shared/utils/topic-interview-config";
import { loadViewableTopic } from "../loaders/load-plaza-topics";

export type TopicInterviewConfigAccess =
  | { ok: true; topic: PlazaTopic; config: InterviewConfig | null }
  | { ok: false; status: 403 | 404; error: string };

/**
 * 議題のインタビュー設定を変えてよいかを確かめる（Server Action と API ルートで共通）
 *
 * 呼ぶ前に requirePlazaAuthor で機能フラグとロールを確かめておくこと。
 * 見てはいけない議題（ほかの人の下書き）は、無い議題と同じく 404 にする。
 */
export async function authorizeTopicInterviewConfigEdit(
  actor: AdminUser,
  topicId: unknown
): Promise<TopicInterviewConfigAccess> {
  const topic = await loadViewableTopic(actor, topicId);
  if (!topic) {
    return { ok: false, status: 404, error: "議題が見つかりません" };
  }

  const config = await findInterviewConfigByTopicId(topic.id);
  const hasResponses = config
    ? await hasInterviewSessionsByConfigId(config.id)
    : false;

  const denied = validateTopicInterviewConfigEdit(actor, topic, {
    hasResponses,
  });
  if (denied) {
    return { ok: false, status: 403, error: denied };
  }

  return { ok: true, topic, config };
}
