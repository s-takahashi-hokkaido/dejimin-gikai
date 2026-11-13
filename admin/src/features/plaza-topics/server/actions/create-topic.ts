"use server";

import { revalidatePath } from "next/cache";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type {
  CreateTopicResult,
  TopicInput,
} from "../../shared/types/plaza-topic";
import { normalizeTopicInput } from "../../shared/utils/validate-topic-input";
import { requirePlazaAuthor } from "../lib/plaza-access";
import { insertDraftTopic } from "../repositories/plaza-topic-repository";

/**
 * 議題を下書きとして作る
 *
 * 議題を出せるのは議員と出馬者だけ（運営者は出せない。K3）。下書きの数に上限は設けない（K4）。
 */
export async function createTopic(
  input: TopicInput
): Promise<CreateTopicResult> {
  try {
    const actor = await requirePlazaAuthor();

    const validated = normalizeTopicInput(input);
    if (!validated.ok) {
      return { error: validated.error };
    }

    const id = await insertDraftTopic(actor, validated.value);

    revalidatePath("/plaza-topics");
    return { success: true, id };
  } catch (error) {
    console.error("Create interview topic error:", error);
    return {
      error: getErrorMessage(error, "議題の作成中にエラーが発生しました"),
    };
  }
}
