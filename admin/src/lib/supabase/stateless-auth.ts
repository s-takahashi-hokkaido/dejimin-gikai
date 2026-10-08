import "server-only";
import type { Database } from "@dejimin-gikai/supabase";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

/**
 * セッションを持たない Auth クライアント（anon キー）
 *
 * ログインしていない人の操作（パスワード再設定メールの申し込み）をサーバーから GoTrue に送るときに使う。
 * Cookie には書かない。PKCE を使わない（implicit）ので、メールのトークンに pkce_ が付かず、
 * 申し込んだのと別のブラウザでリンクを開いても使える。
 */
export function createStatelessAuthClient() {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "implicit",
    },
  }).auth;
}
