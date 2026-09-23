import "server-only";
import { createAdminClient } from "@dejimin-gikai/supabase";

export async function findAdminUsers() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_admin_users");

  if (error) {
    throw new Error(`Failed to fetch admin users: ${error.message}`);
  }
  return data;
}

/** 作成した Auth ユーザーの ID を返す */
export async function createAuthUser(params: {
  email: string;
  password: string;
}): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    // 一覧（get_admin_users）がこれで管理者を判定しているため残す。
    // 管理画面の利用資格の判定は admin_profiles を正とする
    app_metadata: { roles: ["admin"] },
  });

  if (error) {
    throw error;
  }
  return data.user.id;
}

/** admin ロールのプロフィールを作成する（管理画面の利用資格の正） */
export async function createAdminRoleProfile(params: {
  userId: string;
  displayName: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("admin_profiles").insert({
    user_id: params.userId,
    role: "admin",
    display_name: params.displayName,
  });

  if (error) {
    throw new Error(`Failed to create admin profile: ${error.message}`, {
      cause: error,
    });
  }
}

export async function deleteAuthUser(userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw error;
  }
}
