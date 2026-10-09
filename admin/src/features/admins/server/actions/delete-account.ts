"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { findAdminProfileByUserId } from "@/features/auth/server/repositories/admin-profile-repository";
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

    const target = await findAdminProfileByUserId(input.id);
    if (!target) {
      return { error: "アカウントが見つかりません" };
    }

    // 自分かどうかは DB から読んだ ID で比べる（UUID は大文字などの別の書き方でも同じ行に当たるため、
    // 入力の文字列のまま比べると自分を消せてしまう）
    const ruleError = validateAccountDeletion(admin.id, target.user_id);
    if (ruleError) {
      return { error: ruleError };
    }

    // ここで管理画面の利用資格が無くなる（以降の操作は次のリクエストから弾かれる）
    await deleteAdminProfile(admin, target.user_id);

    try {
      await deleteAuthUser(target.user_id);
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
