import "server-only";
import type { Database } from "@dejimin-gikai/supabase";
import { createAdminClient } from "@dejimin-gikai/supabase";

export type AdminProfileRow =
  Database["public"]["Tables"]["admin_profiles"]["Row"];

/** user_id からプロフィールを取得する。存在しなければ null */
export async function findAdminProfileByUserId(
  userId: string
): Promise<AdminProfileRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch admin profile: ${error.message}`, {
      cause: error,
    });
  }

  return data;
}
