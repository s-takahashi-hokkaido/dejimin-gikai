/** 管理画面のロール */
export const ADMIN_ROLES = ["admin", "legislator", "candidate"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/** 全ロール */
export const ALL_ROLES: readonly AdminRole[] = ADMIN_ROLES;

/** 運営者のみ */
export const ADMIN_ONLY: readonly AdminRole[] = ["admin"];

/** 編集権を持つロール（運営者と議員） */
export const EDITOR_ROLES: readonly AdminRole[] = ["admin", "legislator"];

/**
 * AIインタビュー広場で議題を出せるロール（議員と出馬者）
 *
 * 運営者は議題を出せない（機能設計 §5-2、K3）。運営者は全員の議題を閲覧だけできる。
 */
export const PLAZA_AUTHOR_ROLES: readonly AdminRole[] = [
  "legislator",
  "candidate",
];

/** DBから読んだ文字列が既知のロールかどうか */
export function isAdminRole(
  value: string | null | undefined
): value is AdminRole {
  return (
    typeof value === "string" &&
    (ADMIN_ROLES as readonly string[]).includes(value)
  );
}

/** 指定ロールが許可リストに含まれるか */
export function isAllowedRole(
  role: AdminRole,
  allowed: readonly AdminRole[]
): boolean {
  return allowed.includes(role);
}

/** ロールの表示名 */
export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "運営者",
  legislator: "議員",
  candidate: "出馬者",
};
