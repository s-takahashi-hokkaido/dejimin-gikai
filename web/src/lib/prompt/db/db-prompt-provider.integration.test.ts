import { adminClient } from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DbPromptProvider } from "./db-prompt-provider";

describe("DbPromptProvider 統合テスト", () => {
  const promptName = `test-prompt-${Date.now()}`;
  let promptId: string;

  beforeEach(async () => {
    const { data, error } = await adminClient
      .from("prompts")
      .insert({ name: promptName })
      .select("id")
      .single();
    if (error) throw error;
    promptId = data.id;
  });

  afterEach(async () => {
    await adminClient.from("prompts").delete().eq("id", promptId);
  });

  async function createVersion(content: string) {
    const { data, error } = await adminClient.rpc("create_prompt_version", {
      p_prompt_id: promptId,
      p_content: content,
      p_note: "test",
    });
    if (error) throw error;
    return data;
  }

  it("有効な版の本文に変数を埋め込んで返す", async () => {
    await createVersion("旧: {{billName}}");
    const latest = await createVersion("新: {{billName}}");

    const result = await new DbPromptProvider().getPrompt(promptName, {
      billName: "第1号議案",
    });

    expect(result).toEqual({
      content: "新: 第1号議案",
      versionId: latest.id,
    });
  });

  it("過去の版に戻すと、その版の本文を返す", async () => {
    const first = await createVersion("1版");
    await createVersion("2版");
    await adminClient
      .from("prompts")
      .update({ active_version_id: first.id })
      .eq("id", promptId);

    const result = await new DbPromptProvider().getPrompt(promptName);

    expect(result.content).toBe("1版");
  });

  it("編集を始めた版から有効な版が変わっていたら、新しい版を保存しない", async () => {
    const first = await createVersion("1版");
    await createVersion("別の管理者が先に保存した2版");

    const { error } = await adminClient.rpc("create_prompt_version", {
      p_prompt_id: promptId,
      p_content: "1版をもとに編集した本文",
      p_base_version_id: first.id,
    });

    expect(error?.code).toBe("P0409");
    const result = await new DbPromptProvider().getPrompt(promptName);
    expect(result.content).toBe("別の管理者が先に保存した2版");
  });

  it("有効な版が無ければエラーにする", async () => {
    await expect(new DbPromptProvider().getPrompt(promptName)).rejects.toThrow(
      "has no active version"
    );
  });

  it("存在しないプロンプトはエラーにする", async () => {
    await expect(
      new DbPromptProvider().getPrompt(`${promptName}-missing`)
    ).rejects.toThrow("not found");
  });
});
