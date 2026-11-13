"use server";

import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type {
  TopicActionResult,
  TopicIdInput,
} from "../../shared/types/plaza-topic";
import { validateTopicDeletion } from "../../shared/utils/topic-permissions";
import { requirePlazaAuthor } from "../lib/plaza-access";
import { loadViewableTopic } from "../loaders/load-plaza-topics";
import { deleteOwnDraftTopic } from "../repositories/plaza-topic-repository";

/**
 * 議題を削除する
 *
 * 自分の下書きだけ削除できる。ほかの人の議題は、Server Action を直接呼ばれても削除しない。
 */
export async function deleteTopic(
  input: TopicIdInput
): Promise<TopicActionResult> {
  try {
    const actor = await requirePlazaAuthor();

    const topic = await loadViewableTopic(actor, input.id);
    if (!topic) {
      return { error: "議題が見つかりません" };
    }

    const denied = validateTopicDeletion(actor, topic);
    if (denied) {
      return { error: denied };
    }

    const deleted = await deleteOwnDraftTopic(actor, topic.id);
    if (!deleted) {
      return {
        error: "議題が見つからないか、削除できない状態に変わっています",
      };
    }

    revalidatePath("/plaza-topics");
    return { success: true };
  } catch (error) {
    console.error("Delete interview topic error:", error);
    return {
      error: getErrorMessage(error, "議題の削除中にエラーが発生しました"),
    };
  }
}
