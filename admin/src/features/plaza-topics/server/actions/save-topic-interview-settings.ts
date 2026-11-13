"use server";

import { revalidatePath } from "next/cache";
import { upsertTopicInterviewConfigRecord } from "@/features/interview-config/server/repositories/interview-config-repository";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  buildTopicInterviewConfigRecord,
  normalizeTopicInterviewSettings,
} from "../../shared/utils/topic-interview-config";
import { requirePlazaAuthor } from "../lib/plaza-access";
import { authorizeTopicInterviewConfigEdit } from "../lib/topic-interview-config-access";

export type SaveTopicInterviewSettingsResult =
  | { success: true; configId: string; themes: string[] }
  | { error: string };

/**
 * 議題のインタビュー設定のテーマと目安時間を保存する（設定が無ければ作る）
 *
 * 作成者が触れない項目（モード・モデル・ナレッジソースなど）は固定の値で保存する。
 * 自分の下書きで、回答が始まっていない議題だけ。Server Action を直接呼ばれても、ここで確かめる。
 */
export async function saveTopicInterviewSettings(input: {
  topicId: string;
  themes: string[];
  estimatedDuration: number;
}): Promise<SaveTopicInterviewSettingsResult> {
  try {
    const actor = await requirePlazaAuthor();

    const access = await authorizeTopicInterviewConfigEdit(
      actor,
      input.topicId
    );
    if (!access.ok) {
      return { error: access.error };
    }

    const settings = normalizeTopicInterviewSettings(input);
    if (!settings.ok) {
      return { error: settings.error };
    }

    const { id } = await upsertTopicInterviewConfigRecord(
      access.topic.id,
      buildTopicInterviewConfigRecord(settings.value)
    );

    revalidatePath(`/plaza-topics/${access.topic.id}`);
    // 空の行・重複を除いたテーマを返し、画面の入力欄もそろえる
    return { success: true, configId: id, themes: settings.value.themes };
  } catch (error) {
    console.error("Save topic interview settings error:", error);
    return {
      error: getErrorMessage(
        error,
        "インタビュー設定の保存中にエラーが発生しました"
      ),
    };
  }
}
