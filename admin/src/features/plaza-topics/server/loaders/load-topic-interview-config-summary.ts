import "server-only";
import {
  countInterviewQuestionsByConfigId,
  findInterviewConfigByTopicId,
  hasInterviewSessionsByConfigId,
} from "@/features/interview-config/server/repositories/interview-config-repository";
import type { TopicInterviewConfigSummary } from "../../shared/utils/describe-topic-interview-config";

/** 議題の詳細に出すインタビュー設定の要約。設定がまだ無ければ null */
export async function loadTopicInterviewConfigSummary(
  topicId: string
): Promise<TopicInterviewConfigSummary | null> {
  const config = await findInterviewConfigByTopicId(topicId);
  if (!config) {
    return null;
  }
  const [questionsCount, hasResponses] = await Promise.all([
    countInterviewQuestionsByConfigId(config.id),
    hasInterviewSessionsByConfigId(config.id),
  ]);
  return {
    hasResponses,
    themesCount: config.themes?.length ?? 0,
    questionsCount,
    estimatedDuration: config.estimated_duration,
  };
}
