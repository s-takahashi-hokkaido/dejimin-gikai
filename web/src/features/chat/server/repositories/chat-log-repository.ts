import "server-only";

import { createAdminClient } from "@dejimin-gikai/supabase";
import type { ChatLogInsert } from "../../shared/utils/chat-log";

export async function insertChatLogs(rows: ChatLogInsert[]) {
  if (rows.length === 0) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("chat_logs").insert(rows);
  if (error) {
    throw new Error(`Failed to save chat logs: ${error.message}`, {
      cause: error,
    });
  }
}
