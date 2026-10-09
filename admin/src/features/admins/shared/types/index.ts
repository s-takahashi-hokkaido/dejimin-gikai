import type { AdminRole } from "@/features/auth/shared/utils/role";

/**
 * アカウントの状態
 *
 * - invited: 招待メールを送ったが、まだパスワードを設定していない（ログインできない）
 * - active: パスワードを設定済みでログインできる
 */
export type AccountStatus = "invited" | "active";

/** 管理画面のアカウント（運営者・議員・出馬者）の一覧の1行 */
export type AdminAccount = {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  factionId: string | null;
  factionName: string | null;
  status: AccountStatus;
  invitedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

/** 画面から送られてくるロール・所属会派・表示名（サーバーで確かめてから admin_profiles に入れる） */
export type AccountProfileInput = {
  displayName: string;
  role: string;
  factionId: string | null;
};

export type InviteAccountInput = AccountProfileInput & {
  email: string;
};

export type UpdateAccountInput = AccountProfileInput & {
  id: string;
};

export type AccountIdInput = {
  id: string;
};

/** 所属会派の選択肢 */
export type FactionOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type AccountActionResult = { success: true } | { error: string };
