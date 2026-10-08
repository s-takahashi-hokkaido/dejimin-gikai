"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import { findAdminProfileByUserId } from "@/features/auth/server/repositories/admin-profile-repository";
import {
  getAuthErrorCode,
  toAuthErrorMessage,
} from "@/features/auth/shared/utils/auth-error-message";
import { buildUpdatePasswordUrl } from "@/features/auth/shared/utils/auth-paths";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { AccountActionResult, AccountIdInput } from "../../shared/types";
import { validateInvitationResend } from "../../shared/utils/account-rules";
import {
  findAuthUserById,
  sendInvitationEmail,
} from "../repositories/admin-repository";

/**
 * 招待メールを送り直す（リンクの期限切れ・メールの紛失）
 *
 * パスワードを設定する前のアカウントだけ。送り直すと前のメールのリンクは使えなくなる。
 */
export async function resendInvitation(
  input: AccountIdInput
): Promise<AccountActionResult> {
  try {
    await requireAdmin();

    const profile = await findAdminProfileByUserId(input.id);
    if (!profile) {
      return { error: "アカウントが見つかりません" };
    }

    const user = await findAuthUserById(input.id);
    const ruleError = validateInvitationResend(
      user.email_confirmed_at ? "active" : "invited"
    );
    if (ruleError) {
      return { error: ruleError };
    }
    if (!user.email) {
      return { error: "メールアドレスが登録されていません" };
    }

    const redirectTo = buildUpdatePasswordUrl(process.env.NEXT_PUBLIC_APP_URL);
    if (!redirectTo) {
      return {
        error:
          "招待メールのリンク先（NEXT_PUBLIC_APP_URL）が設定されていないため、送れません",
      };
    }

    try {
      await sendInvitationEmail(user.email, redirectTo);
    } catch (sendError) {
      return {
        error: toAuthErrorMessage(
          getAuthErrorCode(sendError),
          `招待メールを送れませんでした: ${getErrorMessage(sendError, "不明なエラー")}`
        ),
      };
    }

    revalidatePath("/admins");
    return { success: true };
  } catch (error) {
    console.error("Resend invitation error:", error);
    return {
      error: getErrorMessage(error, "招待メールの再送中にエラーが発生しました"),
    };
  }
}
