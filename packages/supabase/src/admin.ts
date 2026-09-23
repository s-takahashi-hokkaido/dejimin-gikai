import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase.types";

export type AdminClientOptions = {
  /** PostgREST へのリクエストに付けるヘッダ（例: 監査ログの実行者） */
  headers?: Record<string, string>;
};

// Service role client for server-side operations that bypass RLS
export function createAdminClient(options: AdminClientOptions = {}) {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    options.headers ? { global: { headers: options.headers } } : undefined
  );
}
