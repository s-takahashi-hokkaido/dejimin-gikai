import {
  ADMIN_ONLY,
  type AdminRole,
  ALL_ROLES,
  EDITOR_ROLES,
  isAllowedRole,
  PLAZA_AUTHOR_ROLES,
} from "./role";

/** 機能フラグで出し分ける機能（公開前の機能をナビに出さないため） */
export type NavFeature = "plaza";

/** 有効になっている機能。サーバーで環境変数から作って渡す */
export type EnabledNavFeatures = Readonly<Record<NavFeature, boolean>>;

/** ナビゲーションに表示する項目 */
export type NavItem = {
  href: string;
  label: string;
  /** 指定した機能が有効なときだけ出す */
  feature?: NavFeature;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/bills", label: "議案管理" },
  { href: "/plaza-topics", label: "AIインタビュー広場", feature: "plaza" },
  { href: "/council-sessions", label: "定例会管理" },
  { href: "/tags", label: "タグ管理" },
  { href: "/factions", label: "会派管理" },
  { href: "/committees", label: "委員会管理" },
  { href: "/ai-collection", label: "AI情報収集" },
  { href: "/audit-logs", label: "変更履歴" },
  { href: "/prompts", label: "プロンプト" },
  { href: "/admins", label: "アカウント" },
];

/** 機能フラグを渡さなかったときは、すべて無効として扱う（公開前の機能を出さない側に倒す） */
const NO_FEATURES: EnabledNavFeatures = { plaza: false };

/** トップレベルのパスごとの許可ロール。未定義は admin のみ（deny by default） */
const TOP_LEVEL_RULES: Record<string, readonly AdminRole[]> = {
  "council-sessions": ADMIN_ONLY,
  tags: ADMIN_ONLY,
  factions: ADMIN_ONLY,
  committees: ADMIN_ONLY,
  "ai-collection": ADMIN_ONLY,
  "audit-logs": ADMIN_ONLY,
  prompts: ADMIN_ONLY,
  admins: ADMIN_ONLY,
};

/** /bills 配下は画面ごとに権限が異なる */
function getBillsAllowedRoles(
  second: string | undefined,
  third: string | undefined
): readonly AdminRole[] {
  // /bills
  if (!second) {
    return ALL_ROLES;
  }

  // /bills/new, /bills/merge は破壊的操作を伴うため運営者のみ
  if (second === "new" || second === "merge") {
    return ADMIN_ONLY;
  }

  // /bills/[id]
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

/**
 * /plaza-topics 配下（AIインタビュー広場の議題）
 *
 * 閲覧は全ロール、作成・編集は議員と出馬者だけ（運営者は議題を出せない。K3）。
 * 「自分の議題か」はパスからは分からないので、ページと Server Action で別に確かめる。
 */
function getPlazaTopicsAllowedRoles(
  second: string | undefined,
  third: string | undefined
): readonly AdminRole[] {
  // /plaza-topics（ほかの人の下書きを出さないのは一覧の側で行う）
  if (!second) {
    return ALL_ROLES;
  }

  // /plaza-topics/new
  if (second === "new") {
    return PLAZA_AUTHOR_ROLES;
  }

  // /plaza-topics/[id]
  if (!third) {
    return ALL_ROLES;
  }

  switch (third) {
    // /plaza-topics/[id]/edit
    case "edit":
    // /plaza-topics/[id]/interview（インタビュー設定。作成者本人かは画面と Server Action で確かめる）
    case "interview":
      return PLAZA_AUTHOR_ROLES;
    // 未定義は運営者のみ（deny by default）。画面を足すタスクでここに足す
    default:
      return ADMIN_ONLY;
  }
}

/**
 * パスにアクセスできるロールを返す
 *
 * 未定義のパスは admin のみを返す（deny by default）。
 * ルート定義を増やし忘れても権限が開きすぎる方向には倒れない。
 */
export function getAllowedRoles(pathname: string): readonly AdminRole[] {
  const segments = pathname.split("/").filter(Boolean);
  const [top, second, third] = segments;

  if (!top) {
    return ADMIN_ONLY;
  }

  switch (top) {
    case "bills":
      return getBillsAllowedRoles(second, third);
    case "plaza-topics":
      return getPlazaTopicsAllowedRoles(second, third);
    default:
      return TOP_LEVEL_RULES[top] ?? ADMIN_ONLY;
  }
}

/** そのロールがパスにアクセスできるか */
export function canAccessPage(role: AdminRole, pathname: string): boolean {
  return isAllowedRole(role, getAllowedRoles(pathname));
}

/**
 * そのロールに表示するナビゲーション項目
 *
 * 機能フラグで隠している機能は、ロールにかかわらず出さない。
 */
export function getVisibleNavItems(
  role: AdminRole,
  enabledFeatures: EnabledNavFeatures = NO_FEATURES
): NavItem[] {
  return NAV_ITEMS.filter(
    (item) =>
      (item.feature === undefined || enabledFeatures[item.feature]) &&
      canAccessPage(role, item.href)
  );
}
