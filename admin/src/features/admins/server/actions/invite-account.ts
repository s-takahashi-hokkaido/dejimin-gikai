"use server";

import { revalidatePath } from "next/cache";
import type { AuditActor } from "@/features/audit-logs/shared/utils/audit-actor";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  getAuthErrorCode,
  toAuthErrorMessage,
} from "@/features/auth/shared/utils/auth-error-message";
import { buildUpdatePasswordUrl } from "@/features/auth/shared/utils/auth-paths";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type {
  AccountActionResult,
  InviteAccountInput,
} from "../../shared/types";
import { normalizeInviteInput } from "../../shared/utils/validate-account";
import {
  createUnconfirmedAuthUser,
  deleteAdminProfile,
  deleteAuthUser,
  findAdminAccounts,
  insertAdminProfile,
  sendInvitationEmail,
} from "../repositories/admin-repository";

/**
 * ロールと所属会派を決めてアカウントを作り、招待メールを送る
 *
 * パスワードは本人が招待メールのリンク（admin の /update-password）から設定する。
 * 運営者が相手のパスワードを知っている状態を作らないため（権限設計 §7・§8）。
 */
export async function inviteAccount(
  input: InviteAccountInput
): Promise<AccountActionResult> {
  try {
    const admin = await requireAdmin();

    const validated = normalizeInviteInput(input);
    if (!validated.ok) {
      return { error: validated.error };
    }
    const { email, ...profile } = validated.value;

    const redirectTo = buildUpdatePasswordUrl(process.env.NEXT_PUBLIC_APP_URL);
    if (!redirectTo) {
      return {
        error:
          "招待メールのリンク先（NEXT_PUBLIC_APP_URL）が設定されていないため、招待できません",
      };
    }

    const accounts = await findAdminAccounts();
    if (accounts.some((account) => account.email?.toLowerCase() === email)) {
      return {
        error: "このメールアドレスは既にアカウントとして登録されています",
      };
    }

    let userId: string;
    try {
      userId = await createUnconfirmedAuthUser(email);
    } catch (createError) {
      if (getAuthErrorCode(createError) === "email_exists") {
        // 一覧（admin_profiles）に無いのに Auth には居る。アカウントを消した時に
        // Auth ユーザーの削除だけ失敗した場合など
        return {
          error:
            "このメールアドレスの Auth ユーザーが、アカウント一覧に無いまま残っています。DB の auth.users から削除してから招待し直してください",
        };
      }
      return {
        error: toAuthErrorMessage(
          getAuthErrorCode(createError),
          `アカウントの作成に失敗しました: ${getErrorMessage(createError, "不明なエラー")}`
        ),
      };
    }

    try {
      await insertAdminProfile(admin, userId, profile);
      await sendInvitationEmail(email, redirectTo);
    } catch (inviteError) {
      // 招待メールを送れなかったアカウントを残さない（そのまま招待し直せるようにする）
      await discardAccount(admin, userId);
      return {
        error: toAuthErrorMessage(
          getAuthErrorCode(inviteError),
          `招待に失敗しました: ${getErrorMessage(inviteError, "不明なエラー")}`
        ),
      };
    }

    revalidatePath("/admins");
    return { success: true };
  } catch (error) {
    console.error("Invite account error:", error);
    return {
      error: getErrorMessage(error, "招待中にエラーが発生しました"),
    };
  }
}

/** 招待の途中で失敗したアカウントを消す。消せなくても招待の失敗として返すので、ログだけ残す */
async function discardAccount(actor: AuditActor, userId: string) {
  try {
    await deleteAdminProfile(actor, userId);
  } catch (error) {
    console.error("Rollback of admin profile failed:", error);
  }
  try {
    await deleteAuthUser(userId);
  } catch (error) {
    console.error("Rollback of auth user failed:", error);
  }
}
