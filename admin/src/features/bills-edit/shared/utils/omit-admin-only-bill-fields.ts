import type { AdminRole } from "@/features/auth/shared/utils/role";

/**
 * 議案マスタのうち、運営者だけが変更できる項目
 *
 * 公開日・注目の議案・サムネイルは、公開サイトでの見せ方（どの議案を目立たせるか）を決める。
 * 公開/非公開と同じく、議員に渡すと自会派に有利な議案を目立たせる余地が生まれるため運営者に限る。
 */
export const ADMIN_ONLY_BILL_FIELDS = [
  "published_at",
  "is_featured",
  "thumbnail_url",
  "share_thumbnail_url",
] as const;

/** そのロールが運営者専用の項目を変更できるか */
export function canEditAdminOnlyBillFields(role: AdminRole): boolean {
  return role === "admin";
}

/**
 * 運営者以外の更新から、運営者専用の項目を取り除く
 *
 * 取り除いた項目は update に含めないので、DB の値がそのまま残る。
 * 画面で項目を隠すだけでは Server Action を直接呼ばれると防げないため、サーバー側で必ず通す。
 */
export function omitAdminOnlyBillFields<T extends Record<string, unknown>>(
  role: AdminRole,
  data: T
): Partial<T> {
  if (canEditAdminOnlyBillFields(role)) {
    return data;
  }

  const result: Partial<T> = { ...data };
  for (const field of ADMIN_ONLY_BILL_FIELDS) {
    delete result[field];
  }
  return result;
}
