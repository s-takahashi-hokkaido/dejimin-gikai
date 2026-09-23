import "client-only";
import { createBrowserClient } from "@dejimin-gikai/supabase";
import { hasAdminAccess } from "@/features/auth/server/actions/check-admin-access";

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

  if (!(await hasAdminAccess())) {
    await authClient.signOut();
    throw new Error(
      "管理画面の利用権限がありません。アクセスが拒否されました。"
    );
  }

  return data;
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
