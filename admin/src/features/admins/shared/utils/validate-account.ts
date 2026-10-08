import { type AdminRole, isAdminRole } from "@/features/auth/shared/utils/role";
import type { AccountProfileInput, InviteAccountInput } from "../types";
import { validateEmail } from "./validate-email";

export const DISPLAY_NAME_MAX_LENGTH = 50;

/** admin_profiles に入れる形にそろえたロール・所属会派・表示名 */
export type NormalizedAccountProfile = {
  displayName: string;
  role: AdminRole;
  factionId: string | null;
};

export type NormalizedInvite = NormalizedAccountProfile & {
  email: string;
};

type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * 表示名・ロール・所属会派を確かめて、保存する形にそろえる
 *
 * 会派は議員だけが持つ（admin_profiles の CHECK 制約 admin_profiles_faction_required と同じ）。
 * 議員以外で会派が渡されても捨てる。
 */
export function normalizeAccountProfile(
  input: AccountProfileInput
): Validated<NormalizedAccountProfile> {
  const displayName = input.displayName.trim();
  if (!displayName) {
    return { ok: false, error: "表示名を入力してください" };
  }
  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `表示名は${DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください`,
    };
  }

  if (!isAdminRole(input.role)) {
    return { ok: false, error: "ロールを選択してください" };
  }

  if (input.role !== "legislator") {
    return {
      ok: true,
      value: { displayName, role: input.role, factionId: null },
    };
  }

  const factionId = input.factionId?.trim();
  if (!factionId) {
    return { ok: false, error: "議員は所属会派を選択してください" };
  }
  return { ok: true, value: { displayName, role: input.role, factionId } };
}

/** 招待の入力を確かめて、保存する形にそろえる。メールアドレスは小文字にする */
export function normalizeInviteInput(
  input: InviteAccountInput
): Validated<NormalizedInvite> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "メールアドレスを入力してください" };
  }
  const emailError = validateEmail(email);
  if (emailError) {
    return { ok: false, error: emailError };
  }

  const profile = normalizeAccountProfile(input);
  if (!profile.ok) {
    return profile;
  }
  return { ok: true, value: { ...profile.value, email } };
}
