"use server";

import { revalidatePath } from "next/cache";
import {
  createInterviewQuestions,
  deleteInterviewQuestionsByConfigId,
  upsertTopicInterviewConfigRecord,
} from "@/features/interview-config/server/repositories/interview-config-repository";
import {
  type InterviewQuestionsInput,
  interviewQuestionsInputSchema,
} from "@/features/interview-config/shared/types";
import { prepareQuestionsForInsert } from "@/features/interview-config/shared/utils/prepare-questions-for-insert";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  buildTopicInterviewConfigRecord,
  TOPIC_INTERVIEW_DURATION,
  TOPIC_INTERVIEW_QUESTIONS_MAX,
} from "../../shared/utils/topic-interview-config";
import { requirePlazaAuthor } from "../lib/plaza-access";
import { authorizeTopicInterviewConfigEdit } from "../lib/topic-interview-config-access";

export type SaveTopicInterviewQuestionsResult =
  | { success: true; configId: string }
  | { error: string };

/**
 * 議題のインタビューの質問を保存する（並べた順に置き換える）
 *
 * 設定がまだ無ければ、既定の値（テーマなし・目安時間の既定値）で作ってから保存する。
 * 自分の下書きで、回答が始まっていない議題だけ。
 */
export async function saveTopicInterviewQuestions(input: {
  topicId: string;
  questions: InterviewQuestionsInput;
}): Promise<SaveTopicInterviewQuestionsResult> {
  try {
    const actor = await requirePlazaAuthor();

    const access = await authorizeTopicInterviewConfigEdit(
      actor,
      input.topicId
    );
    if (!access.ok) {
      return { error: access.error };
    }

    const parsed = interviewQuestionsInputSchema.safeParse(input.questions);
    if (!parsed.success) {
      return {
        error:
          parsed.error.issues[0]?.message ?? "質問の形式が正しくありません",
      };
    }
    if (parsed.data.length > TOPIC_INTERVIEW_QUESTIONS_MAX) {
      return {
        error: `質問は${TOPIC_INTERVIEW_QUESTIONS_MAX}個までにしてください`,
      };
    }

    const configId =
      access.config?.id ??
      (
        await upsertTopicInterviewConfigRecord(
          access.topic.id,
          buildTopicInterviewConfigRecord({
            themes: [],
            estimatedDuration: TOPIC_INTERVIEW_DURATION.default,
          })
        )
      ).id;

    await deleteInterviewQuestionsByConfigId(configId);
    if (parsed.data.length > 0) {
      await createInterviewQuestions(
        prepareQuestionsForInsert(parsed.data, configId)
      );
    }

    revalidatePath(`/plaza-topics/${access.topic.id}`);
    return { success: true, configId };
  } catch (error) {
    console.error("Save topic interview questions error:", error);
    return {
      error: getErrorMessage(error, "質問の保存中にエラーが発生しました"),
    };
  }
}
