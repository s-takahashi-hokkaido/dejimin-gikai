"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { findAdminProfileByUserId } from "@/features/auth/server/repositories/admin-profile-repository";
import { isAdminRole } from "@/features/auth/shared/utils/role";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type {
  AccountActionResult,
  UpdateAccountInput,
} from "../../shared/types";
import { validateAccountUpdate } from "../../shared/utils/account-rules";
import { normalizeAccountProfile } from "../../shared/utils/validate-account";
import { updateAdminProfile } from "../repositories/admin-repository";

/**
 * アカウントの表示名・ロール・所属会派を変える
 *
 * 権限は毎回 admin_profiles を引いて判定しているので、ログインし直さなくても次の操作から効く。
 * 選挙後に出馬者を議員にする時、議員を辞めた人の権限を落とす時に使う（権限設計 §8）。
 */
export async function updateAccount(
  input: UpdateAccountInput
): Promise<AccountActionResult> {
  try {
    const admin = await requireAdmin();

    const validated = normalizeAccountProfile(input);
    if (!validated.ok) {
      return { error: validated.error };
    }

    const current = await findAdminProfileByUserId(input.id);
    if (!current || !isAdminRole(current.role)) {
      return { error: "アカウントが見つかりません" };
    }

    const ruleError = validateAccountUpdate({
      actorId: admin.id,
      current: {
        id: current.user_id,
        role: current.role,
        factionId: current.faction_id,
      },
      next: validated.value,
    });
    if (ruleError) {
      return { error: ruleError };
    }

    const updated = await updateAdminProfile(admin, input.id, validated.value);
    if (!updated) {
      return { error: "アカウントが見つかりません" };
    }

    revalidatePath("/admins");
    return { success: true };
  } catch (error) {
    console.error("Update account error:", error);
    return {
      error: getErrorMessage(error, "アカウントの更新中にエラーが発生しました"),
    };
  }
}
