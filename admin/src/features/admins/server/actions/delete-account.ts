"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { AccountActionResult, AccountIdInput } from "../../shared/types";
import { validateAccountDeletion } from "../../shared/utils/account-rules";
import {
  deleteAdminProfile,
  deleteAuthUser,
} from "../repositories/admin-repository";

/**
 * アカウントを削除する
 *
 * 監査ログに実行者を残すため、admin_profiles を先に消してから Auth ユーザーを消す。
 * 過去の変更履歴（admin_audit_logs）の実行者は、削除後も記録した時点のまま残る。
 */
export async function deleteAccount(
  input: AccountIdInput
): Promise<AccountActionResult> {
  try {
    const admin = await requireAdmin();

    const ruleError = validateAccountDeletion(admin.id, input.id);
    if (ruleError) {
      return { error: ruleError };
    }

    // ここで管理画面の利用資格が無くなる（以降の操作は次のリクエストから弾かれる）
    await deleteAdminProfile(admin, input.id);

    try {
      await deleteAuthUser(input.id);
    } catch (deleteError) {
      console.error("Delete auth user error:", deleteError);
      return {
        error: `管理画面には入れなくしましたが、Auth ユーザーの削除に失敗しました。同じメールアドレスで招待し直す前に、DB の auth.users から削除してください: ${getErrorMessage(deleteError, "不明なエラー")}`,
      };
    }

    revalidatePath("/admins");
    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return {
      error: getErrorMessage(error, "アカウントの削除中にエラーが発生しました"),
    };
  }
}
