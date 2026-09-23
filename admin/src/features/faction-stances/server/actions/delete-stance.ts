"use server";

import { createAdminClient } from "@dejimin-gikai/supabase";
import { revalidatePath } from "next/cache";
import { createAuditedAdminClient } from "@/features/audit-logs/server/lib/create-audited-admin-client";
import {
  requireFactionStanceAccess,
  requireRole,
} from "@/features/auth/server/lib/auth-server";
import { EDITOR_ROLES } from "@/features/auth/shared/utils/role";
import { invalidateWebCache } from "@/lib/utils/cache-invalidation";

export async function deleteStance(stanceId: string) {
  try {
    // 引数に会派が無いので、ログインとロールを先に確かめてから対象行の会派を引く
    await requireRole(EDITOR_ROLES);

    const { data: stance, error: findError } = await createAdminClient()
      .from("faction_stances")
      .select("faction_id")
      .eq("id", stanceId)
      .maybeSingle();

    if (findError) {
      console.error("Error finding stance:", findError);
      throw new Error("会派見解の取得に失敗しました");
    }

    if (!stance) {
      throw new Error("会派見解が見つかりません");
    }

    // 運営者は全会派、議員は自会派のみ
    const admin = await requireFactionStanceAccess(stance.faction_id);

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
