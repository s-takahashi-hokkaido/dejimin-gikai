import type { ConfigGenerationRequest } from "../../shared/schemas";

/** プロンプトに入れる既存の質問（議案・議題で共通） */
export type ExistingQuestion = NonNullable<
  ConfigGenerationRequest["existingQuestions"]
>[number];

/** テーマを箇条書きにする */
export function formatThemeList(themes: string[]): string {
  return themes.map((t) => `- ${t}`).join("\n");
}

/** 既存の質問を、フォローアップ指針と選択肢つきの番号付きリストにする */
export function formatExistingQuestionList(
  questions: ExistingQuestion[]
): string {
  return questions
    .map(
      (q, i) =>
        `${i + 1}. ${q.question}${q.follow_up_guide ? `\n   フォローアップ指針: ${q.follow_up_guide}` : ""}${q.quick_replies?.length ? `\n   選択肢: ${q.quick_replies.join(", ")}` : ""}`
    )
    .join("\n");
}
