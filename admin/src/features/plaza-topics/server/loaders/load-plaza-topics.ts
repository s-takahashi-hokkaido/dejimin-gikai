import "server-only";
import { isUuid } from "@/lib/utils/is-uuid";
import type { PlazaTopic } from "../../shared/types/plaza-topic";
import {
  buildTopicListSections,
  type TopicListSections,
} from "../../shared/utils/build-topic-list";
import { toPlazaTopic } from "../../shared/utils/to-plaza-topic";
import {
  canViewTopic,
  type TopicActor,
} from "../../shared/utils/topic-permissions";
import {
  findTopicById,
  findTopicsVisibleTo,
} from "../repositories/plaza-topic-repository";

/** 一覧に出す議題（自分の議題とほかの人の議題、それぞれ状態別・更新の新しい順） */
export async function loadTopicListSections(
  actor: TopicActor
): Promise<TopicListSections> {
  const rows = await findTopicsVisibleTo(actor);
  return buildTopicListSections(actor, rows.map(toPlazaTopic));
}

/**
 * その人が見てよい議題を1件読む
 *
 * 無い議題と、見てはいけない議題（ほかの人の下書き）は、どちらも null を返す
 * （ほかの人の下書きがあることも分からないようにする）。
 */
export async function loadViewableTopic(
  actor: TopicActor,
  id: unknown
): Promise<PlazaTopic | null> {
  if (!isUuid(id)) {
    return null;
  }
  const row = await findTopicById(id);
  if (!row) {
    return null;
  }
  const topic = toPlazaTopic(row);
  return canViewTopic(actor, topic) ? topic : null;
}
