"use server";

import { revalidatePath } from "next/cache";
import { createAuditedAdminClient } from "@/features/audit-logs/server/lib/create-audited-admin-client";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";
import type { DeleteFactionInput } from "../../shared/types";

export async function deleteFaction(input: DeleteFactionInput) {
  try {
    const admin = await requireAdmin();

    // 会派を消すと会派見解もカスケードで消える。監査ログに実行者を残すため
    const supabase = createAuditedAdminClient(admin);

    const { error } = await supabase
      .from("factions")
      .delete()
      .eq("id", input.id);

    if (error) {
      if (error.code === "PGRST116") {
        return { error: "会派が見つかりません" };
      }
      return { error: `会派の削除に失敗しました: ${error.message}` };
    }

    revalidatePath("/factions");
    await invalidateWebCache();

    return { success: true };
  } catch (error) {
    console.error("Delete faction error:", error);
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "会派の削除中にエラーが発生しました" };
  }
}
