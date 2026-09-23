import {
  ADMIN_ONLY,
  type AdminRole,
  ALL_ROLES,
  EDITOR_ROLES,
  isAllowedRole,
} from "./role";

/** ナビゲーションに表示する項目 */
export type NavItem = {
  href: string;
  label: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/bills", label: "議案管理" },
  { href: "/council-sessions", label: "定例会管理" },
  { href: "/tags", label: "タグ管理" },
  { href: "/factions", label: "会派管理" },
  { href: "/committees", label: "委員会管理" },
  { href: "/ai-collection", label: "AI情報収集" },
  { href: "/audit-logs", label: "変更履歴" },
  { href: "/prompts", label: "プロンプト" },
  { href: "/admins", label: "管理者" },
];

/** トップレベルのパスごとの許可ロール。未定義は admin のみ（deny by default） */
const TOP_LEVEL_RULES: Record<string, readonly AdminRole[]> = {
  bills: ALL_ROLES,
  "council-sessions": ADMIN_ONLY,
  tags: ADMIN_ONLY,
  factions: ADMIN_ONLY,
  committees: ADMIN_ONLY,
  "ai-collection": ADMIN_ONLY,
  "audit-logs": ADMIN_ONLY,
  prompts: ADMIN_ONLY,
  admins: ADMIN_ONLY,
};

/**
 * パスにアクセスできるロールを返す
 *
 * 未定義のパスは admin のみを返す（deny by default）。
 * ルート定義を増やし忘れても権限が開きすぎる方向には倒れない。
 */
export function getAllowedRoles(pathname: string): readonly AdminRole[] {
  const segments = pathname.split("/").filter(Boolean);
  const top = segments[0];

  if (!top) {
    return ADMIN_ONLY;
  }

  if (top !== "bills") {
    return TOP_LEVEL_RULES[top] ?? ADMIN_ONLY;
  }

  // /bills 配下は画面ごとに権限が異なる
  const second = segments[1];

  // /bills
  if (!second) {
    return ALL_ROLES;
  }

  // /bills/new, /bills/merge は破壊的操作を伴うため運営者のみ
  if (second === "new" || second === "merge") {
    return ADMIN_ONLY;
  }

  // /bills/[id]
  const third = segments[2];
  if (!third) {
    return ALL_ROLES;
  }

  switch (third) {
    // 議案マスタ・議案コンテンツの編集は議員にも開く
    case "edit":
    case "contents":
      return EDITOR_ROLES;
    // インタビュー結果とトピック分析は出馬者も閲覧できる
    case "reports":
    case "topic-analysis":
      return ALL_ROLES;
    // インタビュー設定など、それ以外は運営者のみ
    default:
      return ADMIN_ONLY;
  }
}

/** そのロールがパスにアクセスできるか */
export function canAccessPage(role: AdminRole, pathname: string): boolean {
  return isAllowedRole(role, getAllowedRoles(pathname));
}

/** そのロールに表示するナビゲーション項目 */
export function getVisibleNavItems(role: AdminRole): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccessPage(role, item.href));
}
