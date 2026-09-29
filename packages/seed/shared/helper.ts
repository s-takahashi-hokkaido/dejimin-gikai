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
