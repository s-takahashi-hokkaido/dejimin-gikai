"use server";

import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type {
  TopicActionResult,
  UpdateTopicInput,
} from "../../shared/types/plaza-topic";
import { validateTopicEdit } from "../../shared/utils/topic-permissions";
import { normalizeTopicInput } from "../../shared/utils/validate-topic-input";
import { requirePlazaAuthor } from "../lib/plaza-access";
import { loadViewableTopic } from "../loaders/load-plaza-topics";
import { updateOwnDraftTopic } from "../repositories/plaza-topic-repository";

/**
 * 議題のタイトルと本文を変える
 *
 * 自分の下書きだけ変えられる。ほかの人の議題は、画面に編集の導線が無くても
 * この Server Action を直接呼ばれうるので、ここで必ず確かめる。
 */
export async function updateTopic(
  input: UpdateTopicInput
): Promise<TopicActionResult> {
  try {
    const actor = await requirePlazaAuthor();

    const topic = await loadViewableTopic(actor, input.id);
    if (!topic) {
      return { error: "議題が見つかりません" };
    }

    const denied = validateTopicEdit(actor, topic);
    if (denied) {
      return { error: denied };
    }

    const validated = normalizeTopicInput(input);
    if (!validated.ok) {
      return { error: validated.error };
    }

    const updated = await updateOwnDraftTopic(actor, topic.id, validated.value);
    if (!updated) {
      return {
        error: "議題が見つからないか、編集できない状態に変わっています",
      };
    }

    revalidatePath("/plaza-topics");
    revalidatePath(`/plaza-topics/${topic.id}`);
    return { success: true };
  } catch (error) {
    console.error("Update interview topic error:", error);
    return {
      error: getErrorMessage(error, "議題の更新中にエラーが発生しました"),
    };
  }
}
