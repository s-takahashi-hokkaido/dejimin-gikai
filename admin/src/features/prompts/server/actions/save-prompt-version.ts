"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { SavePromptVersionInput } from "../../shared/types";
import {
  createPromptVersion,
  updateActivePromptVersion,
} from "../repositories/prompt-repository";

/** 新しい版として保存し、すぐ本番で使う版にする */
export async function savePromptVersion(input: SavePromptVersionInput) {
  try {
    const admin = await requireAdmin();

    if (!input.content.trim()) {
      return { error: "本文を入力してください" };
    }

    const version = await createPromptVersion({
      promptId: input.promptId,
      content: input.content,
      note: input.note.trim() || null,
      createdBy: admin.id,
    });

    revalidatePath("/prompts");
    return { data: { version: version.version } };
  } catch (error) {
    console.error("Save prompt version error:", error);
    return {
      error: getErrorMessage(error, "プロンプトの保存中にエラーが発生しました"),
    };
  }
}

/** 過去の版を本番で使う版に戻す */
export async function activatePromptVersion(input: {
  promptId: string;
  versionId: string;
}) {
  try {
    await requireAdmin();

    await updateActivePromptVersion(input);

    revalidatePath("/prompts");
    return { success: true };
  } catch (error) {
    console.error("Activate prompt version error:", error);
    return {
      error: getErrorMessage(error, "版の切り替え中にエラーが発生しました"),
    };
  }
}
