import "server-only";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth";
import { getAllowedRoles } from "../../shared/utils/can-access-page";
import { canEditFactionStance } from "../../shared/utils/can-edit-faction-stance";
import {
  type AdminRole,
  EDITOR_ROLES,
  isAdminRole,
  isAllowedRole,
} from "../../shared/utils/role";
import { findAdminProfileByUserId } from "../repositories/admin-profile-repository";

/** 管理画面の利用者。認証情報とプロフィールを合成したもの */
export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
  factionId: string | null;
  displayName: string;
};

/**
 * ログイン中の管理画面利用者を取得する
 *
 * ログインしていない、または admin_profiles にレコードが無い場合は null。
 * ロールの正はDB（admin_profiles）であり、JWTの app_metadata は参照しない。
 */
export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const authClient = await createAuthClient();
  const { data } = await authClient.getUser();
  const user = data.user;

  if (!user) {
    return null;
  }

  const profile = await findAdminProfileByUserId(user.id);

  if (!profile || !isAdminRole(profile.role)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    role: profile.role,
    factionId: profile.faction_id,
    displayName: profile.display_name,
  };
}

/**
 * 指定したロールのいずれかであることを要求する
 *
 * 満たさない場合はエラーを投げる。Server Action では必ず先頭で呼ぶこと
 * （UIを隠すだけでは Server Action のエンドポイントを直接叩かれると防げない）。
 */
export async function requireRole(
  allowed: readonly AdminRole[]
): Promise<AdminUser> {
  const user = await getCurrentAdminUser();

  if (!user) {
    throw new Error("管理画面へのログインが必要です");
  }

  if (!isAllowedRole(user.role, allowed)) {
    throw new Error("この操作を行う権限がありません");
  }

  return user;
}

/**
 * 運営者（admin）であることを要求する
 *
 * 既存の呼び出し箇所はすべてこれを使っている。議員などに開く箇所だけを
 * 明示的に requireRole へ書き換える運用にすることで、書き換え漏れは
 * 「権限が開きすぎる」ではなく「閉じすぎる」方向に倒れる。
 */
export async function requireAdmin(): Promise<AdminUser> {
  return requireRole(["admin"]);
}

/**
 * ページ（Server Components）用。資格が無ければリダイレクトする
 *
 * Server Action では throw する requireRole を使う。ページでエラーを投げると
 * エラー画面になってしまうため、こちらはリダイレクトで返す。
 */
export async function requireRoleOrRedirect(
  allowed: readonly AdminRole[]
): Promise<AdminUser> {
  const user = await getCurrentAdminUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAllowedRole(user.role, allowed)) {
    redirect("/login?error=unauthorized");
  }

  return user;
}

/**
 * ページ（Server Components）の先頭で呼ぶ。そのページに必要なロールを要求する
 *
 * `route` はルートのパターン（例: `/bills/[id]/edit`）。許可ロールは
 * `getAllowedRoles` の定義を使うので、ナビゲーションの出し分けと食い違わない。
 * レイアウトはクライアント遷移で再実行されないため、ページごとに呼ぶ必要がある。
 */
export async function requirePageAccess(route: string): Promise<AdminUser> {
  return requireRoleOrRedirect(getAllowedRoles(route));
}

/**
 * 会派見解を編集する資格を要求する。無ければ throw
 *
 * 運営者は全会派、議員は自分が所属する会派のみ編集できる。
 */
export async function requireFactionStanceAccess(
  factionId: string
): Promise<AdminUser> {
  const user = await requireRole(EDITOR_ROLES);

  if (!canEditFactionStance(user, factionId)) {
    throw new Error("自分が所属する会派の見解のみ編集できます");
  }

  return user;
}
