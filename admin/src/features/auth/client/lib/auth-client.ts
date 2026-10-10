import "client-only";
import { createBrowserClient } from "@dejimin-gikai/supabase";
import { hasAdminAccess } from "@/features/auth/server/actions/check-admin-access";
import { toAuthErrorMessage } from "../../shared/utils/auth-error-message";
import type { EmailLinkType } from "../../shared/utils/email-link";

const supabase = createBrowserClient();
export const authClient = supabase.auth;

export async function signIn(email: string, password: string) {
  const { data, error } = await authClient.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(
      "ログインに失敗しました。メールアドレスとパスワードを確認してください。"
    );
  }

  await ensureAdminAccess();

  return data;
}

/**
 * ログイン中のユーザーに管理画面の利用資格（admin_profiles）があるか確かめる
 *
 * 無ければログアウトさせてエラーを投げる。資格はサーバーに問い合わせる（JWT だけでは分からない）。
 */
export async function ensureAdminAccess() {
  if (!(await hasAdminAccess())) {
    await authClient.signOut();
    throw new Error(
      "管理画面の利用権限がありません。アクセスが拒否されました。"
    );
  }
}

/**
 * 招待・パスワード再設定メールのリンクのトークンを確かめ、そのユーザーとしてログインする
 *
 * トークンは一度しか使えない。成功するとセッションが Cookie に入る。
 */
export async function verifyEmailLink(tokenHash: string, type: EmailLinkType) {
  const { error } = await authClient.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    throw new Error(
      toAuthErrorMessage(
        error.code,
        "リンクを確認できませんでした。リンクの有効期限が切れている可能性があります"
      )
    );
  }
}

/** ログイン中のユーザーのパスワードを設定する */
export async function updatePassword(password: string) {
  const { error } = await authClient.updateUser({ password });

  if (error) {
    throw new Error(
      toAuthErrorMessage(
        error.code,
        "パスワードを設定できませんでした。もう一度お試しください"
      )
    );
  }
}

export async function signOut() {
  const { error } = await authClient.signOut();
  if (error) {
    throw new Error("ログアウトに失敗しました。");
  }
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await authClient.getUser();
  if (error) {
    throw new Error(`ユーザー情報の取得に失敗しました。${error}`);
  }
  return user;
}
