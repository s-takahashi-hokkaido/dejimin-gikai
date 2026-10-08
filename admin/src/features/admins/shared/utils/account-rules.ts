import type { AdminRole } from "@/features/auth/shared/utils/role";
import type { AccountStatus } from "../types";

/**
 * ロール・所属会派の変更を確かめる。問題があればメッセージを返す
 *
 * 運営者は自分のロールと所属会派を変えられない。最後の運営者が自分を議員や出馬者にすると、
 * 誰もアカウントを管理できなくなるため。変える時は別の運営者に頼む。表示名は自分でも変えられる。
 */
export function validateAccountUpdate({
  actorId,
  current,
  next,
}: {
  actorId: string;
  current: { id: string; role: AdminRole; factionId: string | null };
  next: { role: AdminRole; factionId: string | null };
}): string | null {
  if (actorId !== current.id) {
    return null;
  }
  if (current.role !== next.role || current.factionId !== next.factionId) {
    return "自分のロール・所属会派は変更できません。別の運営者に依頼してください";
  }
  return null;
}

/** アカウントの削除を確かめる。自分自身は削除できない */
export function validateAccountDeletion(
  actorId: string,
  targetId: string
): string | null {
  return actorId === targetId ? "自分自身を削除することはできません" : null;
}

/** 招待メールを送り直せるか確かめる。パスワードを設定する前（招待中）だけ送れる */
export function validateInvitationResend(status: AccountStatus): string | null {
  return status === "invited"
    ? null
    : "このアカウントはパスワードを設定済みです。パスワードを忘れた場合は、ログイン画面の「パスワードをお忘れの方」から再設定できます";
}
