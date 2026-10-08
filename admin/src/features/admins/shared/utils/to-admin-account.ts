import type { Database } from "@dejimin-gikai/supabase";
import { isAdminRole } from "@/features/auth/shared/utils/role";
import type { AdminAccount } from "../types";

export type AdminAccountRow =
  Database["public"]["Functions"]["get_admin_accounts"]["Returns"][number];

/**
 * get_admin_accounts() の行を一覧の1行にする
 *
 * 型の上では null にならないことになっている列も、DB 関数の戻り値は実際には null がありうる
 * （型生成が関数の列の null 許容を表せない）ので null に寄せる。
 * ロールが分からない行（CHECK 制約があるので通常は無い）は null を返す。
 */
export function toAdminAccount(row: AdminAccountRow): AdminAccount | null {
  if (!isAdminRole(row.role)) {
    return null;
  }

  return {
    id: row.user_id,
    email: row.email ?? "",
    displayName: row.display_name,
    role: row.role,
    factionId: row.faction_id ?? null,
    factionName: row.faction_name ?? null,
    // メールアドレスが確認済み＝招待メールのリンクからパスワードを設定した
    status: row.email_confirmed_at ? "active" : "invited",
    invitedAt: row.invited_at ?? null,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at ?? null,
  };
}
