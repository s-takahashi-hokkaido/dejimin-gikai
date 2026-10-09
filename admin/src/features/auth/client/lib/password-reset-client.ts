import "client-only";
import type { Database } from "@dejimin-gikai/supabase";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

type PasswordResetAuth = SupabaseClient<Database>["auth"];

let passwordResetAuth: PasswordResetAuth | null = null;

/**
 * パスワード再設定メールの申し込みだけに使う Auth クライアント（anon キー・セッション無し）
 *
 * - 利用者のブラウザから GoTrue に送る。サーバーから送ると、GoTrue の IP ごとの上限（/recover）を
 *   全員で1つ分け合うことになり、誰かが申し込みを繰り返すと全員が申し込めなくなる
 * - PKCE を使わない（implicit）。トークンに pkce_ が付かず、申し込んだのと別のブラウザでリンクを開いても使える
 * - ログイン用のクライアント（auth-client.ts）とは別物。この画面で使う時だけ作る
 *   （同じ画面に GoTrueClient が2つあると supabase-js が警告を出す）
 */
function getPasswordResetAuth(): PasswordResetAuth {
  passwordResetAuth ??= createClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  ).auth;
  return passwordResetAuth;
}

/**
 * パスワード再設定メールを申し込む。GoTrue のエラーをそのまま返す（無ければ null）
 *
 * 登録の無いメールアドレスでも GoTrue はメールを送らずに成功を返す。
 */
export async function sendPasswordResetEmail(
  email: string,
  redirectTo: string
) {
  const { error } = await getPasswordResetAuth().resetPasswordForEmail(email, {
    redirectTo,
  });
  return error;
}
