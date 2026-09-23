"use server";

import { revalidatePath } from "next/cache";
import { createAuditedAdminClient } from "@/features/audit-logs/server/lib/create-audited-admin-client";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";

export async function deleteStance(stanceId: string) {
  try {
    const admin = await requireAdmin();

    const supabase = createAuditedAdminClient(admin);

    const { error } = await supabase
      .from("faction_stances")
      .delete()
      .eq("id", stanceId);

    if (error) {
      console.error("Error deleting stance:", error);
      throw new Error("会派見解の削除に失敗しました");
    }

    revalidatePath("/bills", "layout");
    await invalidateWebCache();
    return { success: true };
  } catch (error) {
    console.error("Error in deleteStance:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}
