/** 議題の詳細に出すインタビュー設定の要約 */
export type TopicInterviewConfigSummary = {
  themesCount: number;
  questionsCount: number;
  estimatedDuration: number | null;
  /** 回答が始まっているか（始まっていれば設定は変更できない） */
  hasResponses: boolean;
};

/** 要約を1行の文にする。設定がまだ無ければ、オープンに質問が要ることを伝える */
export function describeTopicInterviewConfig(
  summary: TopicInterviewConfigSummary | null
): string {
  if (!summary) {
    return "まだありません。オープンするには、インタビューの質問が必要です。";
  }
  const duration =
    summary.estimatedDuration !== null
      ? `・目安 ${summary.estimatedDuration}分`
      : "";
  return `テーマ ${summary.themesCount}件・質問 ${summary.questionsCount}件${duration}`;
}
