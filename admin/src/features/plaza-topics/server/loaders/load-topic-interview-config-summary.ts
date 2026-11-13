import "server-only";
import {
  findInterviewConfigByTopicId,
  findInterviewQuestionsByConfigId,
  hasInterviewSessionsByConfigId,
} from "@/features/interview-config/server/repositories/interview-config-repository";

export type TopicInterviewConfigSummary = {
  themesCount: number;
  questionsCount: number;
  estimatedDuration: number | null;
  /** 回答が始まっているか（始まっていれば設定は変更できない） */
  hasResponses: boolean;
};

/** 議題の詳細に出すインタビュー設定の要約。設定がまだ無ければ null */
export async function loadTopicInterviewConfigSummary(
  topicId: string
): Promise<TopicInterviewConfigSummary | null> {
  const config = await findInterviewConfigByTopicId(topicId);
  if (!config) {
    return null;
  }
  const [questions, hasResponses] = await Promise.all([
    findInterviewQuestionsByConfigId(config.id),
    hasInterviewSessionsByConfigId(config.id),
  ]);
  return {
    hasResponses,
    themesCount: config.themes?.length ?? 0,
    questionsCount: questions.length,
    estimatedDuration: config.estimated_duration,
  };
}
