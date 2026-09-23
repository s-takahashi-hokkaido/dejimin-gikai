import "server-only";
import { createAdminClient } from "@dejimin-gikai/supabase";

/** 名前でプロンプトを引き、有効な版の本文を返す。見つからなければ null */
export async function findActivePromptVersionByName(name: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prompts")
    .select(
      "active_version:prompt_versions!prompts_active_version_fkey(id, content)"
    )
    .eq("name", name)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch prompt "${name}": ${error.message}`);
  }
  return data?.active_version ?? null;
}
