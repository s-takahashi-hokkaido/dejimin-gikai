import { describe, expect, it } from "vitest";
import {
  CHAT_MODEL_GROUPS,
  CHAT_MODEL_OPTIONS,
  isValidChatModel,
} from "./chat-model-options";

describe("CHAT_MODEL_OPTIONS", () => {
  it("全てのオプションがOpenAIのモデルID（接頭辞なし）を持つ", () => {
    for (const option of CHAT_MODEL_OPTIONS) {
      expect(option.value).not.toContain("/");
      expect(option.value).toMatch(/^(gpt-|o\d)/);
    }
  });

  it("全てのオプションがラベルを持つ", () => {
    for (const option of CHAT_MODEL_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it("重複するvalueがない", () => {
    const values = CHAT_MODEL_OPTIONS.map((opt) => opt.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("CHAT_MODEL_GROUPS", () => {
  it("OpenAIのグループだけが存在する", () => {
    expect(CHAT_MODEL_GROUPS.map((g) => g.provider)).toEqual(["OpenAI"]);
  });

  it("全グループのモデル数がフラット一覧と一致する", () => {
    const groupTotal = CHAT_MODEL_GROUPS.reduce(
      (sum, g) => sum + g.options.length,
      0
    );
    expect(groupTotal).toBe(CHAT_MODEL_OPTIONS.length);
  });

  it("全モデルに推定コストが設定されている", () => {
    for (const group of CHAT_MODEL_GROUPS) {
      for (const option of group.options) {
        expect(option.estimatedCost).not.toBeNull();
        expect(option.estimatedCost).toMatch(/^~\d+円$/);
      }
    }
  });
});

describe("isValidChatModel", () => {
  it("有効なモデルIDに対してtrueを返す", () => {
    expect(isValidChatModel("gpt-4o-mini")).toBe(true);
    expect(isValidChatModel("gpt-5.1-chat-latest")).toBe(true);
  });

  it("無効なモデルIDに対してfalseを返す", () => {
    expect(isValidChatModel("invalid-model")).toBe(false);
    expect(isValidChatModel("openai/nonexistent")).toBe(false);
    // Vercel AI Gateway 形式や、OpenAI 以外のモデルは選べない
    expect(isValidChatModel("openai/gpt-4o-mini")).toBe(false);
    expect(isValidChatModel("google/gemini-3-flash")).toBe(false);
    expect(isValidChatModel("anthropic/claude-sonnet-4.6")).toBe(false);
    expect(isValidChatModel("")).toBe(false);
  });
});
