import type { PlazaTopicSummary, TopicStatus } from "../types/plaza-topic";
import { canViewTopic, isOwnTopic, type TopicActor } from "./topic-permissions";

/**
 * 管理画面の一覧で状態を並べる順
 *
 * 管理画面は議題を作る側の画面なので、ランダムにせず状態別に整理して見せる（K5）。
 * 作成者が今扱っている議題（オープン中）、次に出す議題（下書き）、終わった議題（クローズ済み）の順。
 */
export const TOPIC_LIST_STATUS_ORDER: readonly TopicStatus[] = [
  "open",
  "draft",
  "closed",
];

export type TopicGroup = {
  status: TopicStatus;
  topics: PlazaTopicSummary[];
};

export type TopicListSections = {
  /** 自分の議題（すべての状態） */
  own: TopicGroup[];
  /** ほかの人の議題（議員・出馬者にはオープン中とクローズ済みだけ。運営者には下書きも） */
  others: TopicGroup[];
};

/** 更新の新しい順。同時刻は ID 順にして、開き直しても順序が変わらないようにする */
function compareByUpdatedAtDesc(
  a: PlazaTopicSummary,
  b: PlazaTopicSummary
): number {
  const diff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  if (diff !== 0) {
    return diff;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** 状態別に分け、それぞれを更新の新しい順に並べる。議題が無い状態は省く */
export function groupTopicsByStatus(topics: PlazaTopicSummary[]): TopicGroup[] {
  return TOPIC_LIST_STATUS_ORDER.map((status) => ({
    status,
    topics: topics
      .filter((topic) => topic.status === status)
      .sort(compareByUpdatedAtDesc),
  })).filter((group) => group.topics.length > 0);
}

/**
 * 一覧を「自分の議題」と「ほかの人の議題」に分ける
 *
 * 見てはいけない議題（ほかの人の下書き）は、DB から読む段階で除いているが、ここでも除く。
 */
export function buildTopicListSections(
  actor: TopicActor,
  topics: PlazaTopicSummary[]
): TopicListSections {
  const own: PlazaTopicSummary[] = [];
  const others: PlazaTopicSummary[] = [];

  for (const topic of topics) {
    if (isOwnTopic(actor, topic)) {
      own.push(topic);
    } else if (canViewTopic(actor, topic)) {
      others.push(topic);
    }
  }

  return {
    own: groupTopicsByStatus(own),
    others: groupTopicsByStatus(others),
  };
}
