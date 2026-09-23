import "server-only";
import { createAdminClient } from "@dejimin-gikai/supabase";

export async function findPrompts() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prompts")
    .select(
      "id, name, description, updated_at, active_version:prompt_versions!prompts_active_version_fkey(version)"
    )
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch prompts: ${error.message}`);
  }
  return data;
}

export async function findPromptById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prompts")
    .select(
      "id, name, description, active_version_id, versions:prompt_versions!prompt_versions_prompt_id_fkey(id, version, content, note, created_at)"
    )
    .eq("id", id)
    .order("version", { referencedTable: "versions", ascending: false })
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch prompt: ${error.message}`);
  }
  return data;
}

/** 新しい版を追加して有効にする（採番と付け替えは DB 関数で1トランザクション） */
export async function createPromptVersion(params: {
  promptId: string;
  content: string;
  note: string | null;
  createdBy: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_prompt_version", {
    p_prompt_id: params.promptId,
    p_content: params.content,
    p_note: params.note ?? undefined,
    p_created_by: params.createdBy,
  });

  if (error) {
    throw new Error(`Failed to create prompt version: ${error.message}`);
  }
  return data;
}

export async function updateActivePromptVersion(params: {
  promptId: string;
  versionId: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("prompts")
    .update({ active_version_id: params.versionId })
    .eq("id", params.promptId);

  if (error) {
    throw new Error(`Failed to activate prompt version: ${error.message}`);
  }
}
