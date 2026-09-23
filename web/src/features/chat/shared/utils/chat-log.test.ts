import { describe, expect, it } from "vitest";
import {
  buildChatLogRows,
  type ChatLogContext,
  extractLatestUserText,
  normalizeChatPageType,
} from "./chat-log";

const context: ChatLogContext = {
  userId: "user-1",
  sessionId: "session-1",
  pageType: "bill",
  billId: "bill-1",
  promptName: "bill-chat-system-normal",
  promptVersionId: "version-1",
  model: "openai/gpt-4o",
};

describe("extractLatestUserText", () => {
  it("最後のユーザーの発言のテキストを返す", () => {
    const text = extractLatestUserText([
      { role: "user", parts: [{ type: "text", text: "最初の質問" }] },
      { role: "assistant", parts: [{ type: "text", text: "応答" }] },
      { role: "user", parts: [{ type: "text", text: "次の質問" }] },
    ]);
    expect(text).toBe("次の質問");
  });

  it("テキスト以外のパートは無視し、複数のテキストは改行でつなぐ", () => {
    const text = extractLatestUserText([
      {
        role: "user",
        parts: [
          { type: "text", text: "1行目" },
          { type: "step-start" },
          { type: "text", text: "2行目" },
        ],
      },
    ]);
    expect(text).toBe("1行目\n2行目");
  });

  it("ユーザーの発言が無ければ空文字を返す", () => {
    expect(extractLatestUserText([])).toBe("");
    expect(
      extractLatestUserText([
        { role: "assistant", parts: [{ type: "text", text: "応答" }] },
      ])
    ).toBe("");
  });
});

describe("normalizeChatPageType", () => {
  it.each(["home", "bill", "budget"] as const)("%s はそのまま返す", (type) => {
    expect(normalizeChatPageType(type)).toBe(type);
  });

  it("未指定や想定外の値は議案のチャットとして扱う", () => {
    expect(normalizeChatPageType(undefined)).toBe("bill");
    expect(normalizeChatPageType("unknown")).toBe("bill");
  });
});

describe("buildChatLogRows", () => {
  it("ユーザーの発言と AI の応答の2行を作る", () => {
    const rows = buildChatLogRows({
      context,
      userText: "質問",
      assistantText: "応答",
    });

    expect(rows).toEqual([
      {
        user_id: "user-1",
        session_id: "session-1",
        page_type: "bill",
        bill_id: "bill-1",
        prompt_name: "bill-chat-system-normal",
        prompt_version_id: "version-1",
        role: "user",
        message: "質問",
        model: null,
      },
      {
        user_id: "user-1",
        session_id: "session-1",
        page_type: "bill",
        bill_id: "bill-1",
        prompt_name: "bill-chat-system-normal",
        prompt_version_id: "version-1",
        role: "assistant",
        message: "応答",
        model: "openai/gpt-4o",
      },
    ]);
  });

  it("本文が空白だけの発言は保存しない", () => {
    const rows = buildChatLogRows({
      context,
      userText: "質問",
      assistantText: "  \n",
    });
    expect(rows.map((row) => row.role)).toEqual(["user"]);
  });

  it("セッション ID が空文字なら null にする", () => {
    const [row] = buildChatLogRows({
      context: { ...context, sessionId: "" },
      userText: "質問",
      assistantText: "",
    });
    expect(row.session_id).toBeNull();
  });
});
