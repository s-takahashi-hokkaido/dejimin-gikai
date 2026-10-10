import "server-only";
import { createAdminClient } from "@dejimin-gikai/supabase";
import { createAuditedAdminClient } from "@/features/audit-logs/server/lib/create-audited-admin-client";
import type { AuditActor } from "@/features/audit-logs/shared/utils/audit-actor";
import { toProfileWriteErrorMessage } from "../../shared/utils/profile-write-error";
import type { NormalizedAccountProfile } from "../../shared/utils/validate-account";

/** 管理画面のアカウント一覧（admin_profiles を持つ Auth ユーザー） */
export async function findAdminAccounts() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_admin_accounts");

  if (error) {
    throw new Error(`Failed to fetch admin accounts: ${error.message}`, {
      cause: error,
    });
  }
  return data ?? [];
}

/**
 * 招待前の Auth ユーザー（未確認・パスワード無し）を作り、ID を返す
 *
 * inviteUserByEmail に新しいメールアドレスを渡すとユーザーの作成を伴うため、
 * メールでのサインアップを拒否する before_user_created フックに弾かれる。
 * admin API の createUser はフックを通らないので、先にこれで作ってから招待メールを送る。
 * パスワードを渡さないと GoTrue がランダムなものを付けるので、本人が設定するまでログインできない。
 */
export async function createUnconfirmedAuthUser(
  email: string
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
  });

  if (error) {
    throw error;
  }
  return data.user.id;
}

/**
 * 招待メールを送る
 *
 * 未確認のユーザーにだけ送れる（確認済みなら email_exists）。送り直すと前のリンクは使えなくなる。
 */
export async function sendInvitationEmail(email: string, redirectTo: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  if (error) {
    throw error;
  }
}

export async function findAuthUserById(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }
  return data.user;
}

export async function deleteAuthUser(userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw error;
  }
}

function toProfileWriteError(
  operation: string,
  error: { code?: string; message: string }
): Error {
  return new Error(
    toProfileWriteErrorMessage(error.code) ??
      `Failed to ${operation} admin profile: ${error.message}`,
    { cause: error }
  );
}

/** admin_profiles を作る（監査ログに実行者が残る） */
export async function insertAdminProfile(
  actor: AuditActor,
  userId: string,
  profile: NormalizedAccountProfile
) {
  const supabase = createAuditedAdminClient(actor);
  const { error } = await supabase.from("admin_profiles").insert({
    user_id: userId,
    role: profile.role,
    faction_id: profile.factionId,
    display_name: profile.displayName,
  });

  if (error) {
    throw toProfileWriteError("create", error);
  }
}

/** admin_profiles を更新する（監査ログに実行者が残る）。対象が無ければ false */
export async function updateAdminProfile(
  actor: AuditActor,
  userId: string,
  profile: NormalizedAccountProfile
): Promise<boolean> {
  const supabase = createAuditedAdminClient(actor);
  const { data, error } = await supabase
    .from("admin_profiles")
    .update({
      role: profile.role,
      faction_id: profile.factionId,
      display_name: profile.displayName,
    })
    .eq("user_id", userId)
    .select("user_id");

  if (error) {
    throw toProfileWriteError("update", error);
  }
  return (data ?? []).length > 0;
}

/**
 * admin_profiles を消す（監査ログに実行者が残る）
 *
 * Auth ユーザーを消すとカスケードで消えるが、その削除は GoTrue が行うので実行者が残らない。
 * アカウントを消す時は、先にこれで消してから Auth ユーザーを消す。
 */
export async function deleteAdminProfile(actor: AuditActor, userId: string) {
  const supabase = createAuditedAdminClient(actor);
  const { error } = await supabase
    .from("admin_profiles")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw toProfileWriteError("delete", error);
  }
}

/** 所属会派の選択肢（表示順） */
export async function findFactionOptions() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("factions")
    .select("id, display_name, is_active")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch factions: ${error.message}`, {
      cause: error,
    });
  }
  return data ?? [];
}
