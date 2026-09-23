"use server";

import { createAdminClient } from "@dejimin-gikai/supabase";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";
import type { UpdateCommitteeInput } from "../../shared/types";

export async function updateCommittee(input: UpdateCommitteeInput) {
  try {
    await requireAdmin();

    const supabase = createAdminClient();

    if (!input.name || input.name.trim().length === 0) {
      return { error: "委員会名を入力してください" };
    }

    const { data, error } = await supabase
      .from("committees")
      .update({
        name: input.name.trim(),
        committee_type: input.committee_type,
        description: input.description || null,
        sort_order: input.sort_order,
        is_active: input.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "この委員会名は既に存在します" };
      }
      if (error.code === "PGRST116") {
        return { error: "委員会が見つかりません" };
      }
      return { error: `委員会の更新に失敗しました: ${error.message}` };
    }

    revalidatePath("/committees");
    await invalidateWebCache();

    return { data };
  } catch (error) {
    console.error("Update committee error:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "委員会の更新中にエラーが発生しました" };
  }
}
