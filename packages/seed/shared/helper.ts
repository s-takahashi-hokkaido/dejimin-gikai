import { createClient } from "@supabase/supabase-js";
import type { Database } from "@dejimin-gikai/supabase";

export type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Service Role Key で繋ぐ Supabase クライアント。
 *
 * 接続先を引数で渡せるようにしてある（`master/run.ts` が「表示した接続先」と
 * 「実際に繋ぐ接続先」を1つの値に揃えるため）。省略時は環境変数から読む。
 */
export function createAdminClient(config?: {
  supabaseUrl: string;
  serviceRoleKey: string;
}) {
  return createClient<Database>(
    config?.supabaseUrl ?? process.env.SUPABASE_URL!,
    config?.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TABLES_TO_CLEAR = [
  "interview_report",
  "interview_messages",
  "interview_sessions",
  "interview_questions",
  "interview_configs",
  "interview_topics",
  "faction_stances",
  "chats",
  "bill_contents",
  "bills_tags",
  "bills",
  "tags",
  "factions",
  "committees",
  "council_sessions",
] as const;

export async function clearAllData(supabase: AdminClient) {
  console.log("🧹 Clearing existing data...");

  for (const table of TABLES_TO_CLEAR) {
    await supabase
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
  }

  console.log("✅ Cleared existing data");
}

/**
 * 指定したメールアドレスの Auth ユーザーを削除する（admin_profiles は cascade で消える）。
 *
 * seed で作る議員アカウントは会派（factions）を参照しているので、
 * clearAllData で会派を消す前に呼ぶ。
 */
export async function deleteAuthUsersByEmail(
  supabase: AdminClient,
  emails: readonly string[]
) {
  const targets = new Set(emails.map((email) => email.toLowerCase()));
  const perPage = 1000;
  const userIds: string[] = [];

  // 削除しながらページを進めると行がずれるので、先に全ページを読んでから消す
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(`Failed to list auth users: ${error.message}`);

    for (const user of data.users) {
      if (user.email && targets.has(user.email.toLowerCase())) {
        userIds.push(user.id);
      }
    }

    if (data.users.length < perPage) break;
  }

  for (const userId of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      throw new Error(`Failed to delete auth user ${userId}: ${error.message}`);
    }
  }
}
