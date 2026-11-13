import { convertArrayToReadableStream, MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";

// 議案の経路のために読み込むモジュールが、読み込み時に Supabase の環境変数を確かめる。
// 議題の経路は DB に触らないので、値はダミーでよい（import より先に入れる）
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54121";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
});
import {
  CONFIG_GENERATION_MODEL,
  handleConfigGeneration,
} from "./handle-config-generation";

/**
 * 議題のインタビュー設定の AI 生成（LLM はモックに差し替える）
 *
 * 議題の生成は DB を読まない（議題の問いと本文は呼び出し側が渡す）ので、外部に依存せずに確かめられる。
 */

const THEMES_JSON = JSON.stringify({
  text: "テーマを提案します",
  themes: ["除雪の時間帯", "通学路の安全"],
});

function createStreamModel(json: string) {
  return new MockLanguageModelV3({
    doStream: {
      stream: convertArrayToReadableStream([
        { type: "stream-start" as const, warnings: [] as [] },
        { type: "text-start" as const, id: "t1" },
        { type: "text-delta" as const, id: "t1", delta: json },
        { type: "text-end" as const, id: "t1" },
        {
          type: "finish" as const,
          finishReason: { unified: "stop" as const, raw: undefined },
          usage: {
            inputTokens: {
              total: 1200,
              noCache: 1200,
              cacheRead: 0,
              cacheWrite: 0,
            },
            outputTokens: { total: 300, text: 300, reasoning: 0 },
          },
        },
      ]),
    },
  });
}

/** モデルに渡ったシステムプロンプトと、最初のユーザーメッセージ */
function readPrompt(model: MockLanguageModelV3) {
  const prompt = model.doStreamCalls[0]?.prompt ?? [];
  const system = prompt.find((m) => m.role === "system");
  const user = prompt.find((m) => m.role === "user");
  return {
    system: system?.role === "system" ? system.content : "",
    user:
      user?.role === "user"
        ? user.content
            .map((part) => (part.type === "text" ? part.text : ""))
            .join("")
        : "",
  };
}

describe("handleConfigGeneration（議題）", () => {
  const target = {
    kind: "topic" as const,
    title: "冬の除雪で、いちばん困っていることは何ですか",
    bodyMd: "## 聞きたいこと\n- 通学路のこと",
  };

  it("議題向けのプロンプトで生成し、提案を stage つきで返す", async () => {
    const model = createStreamModel(THEMES_JSON);
    const response = await handleConfigGeneration({
      messages: [],
      target,
      stage: "theme_proposal",
      model,
    });

    const body = JSON.parse(await response.text());
    expect(body).toEqual({
      text: "テーマを提案します",
      themes: ["除雪の時間帯", "通学路の安全"],
      stage: "theme_proposal",
    });

    const { system, user } = readPrompt(model);
    expect(system).toContain("## 議題");
    expect(system).toContain(target.title);
    expect(system).toContain(
      "<topic_body>\n## 聞きたいこと\n- 通学路のこと\n</topic_body>"
    );
    expect(system).not.toContain("法案");
    expect(user).toBe("議題の内容を分析して、テーマを提案してください。");
  });

  it("生成が終わったら利用量を渡す", async () => {
    const onUsage = vi.fn(async () => {});
    const response = await handleConfigGeneration({
      messages: [],
      target,
      stage: "theme_proposal",
      model: createStreamModel(THEMES_JSON),
      onUsage,
    });
    await response.text();
    await vi.waitFor(() => expect(onUsage).toHaveBeenCalledTimes(1));

    expect(onUsage).toHaveBeenCalledWith({
      model: CONFIG_GENERATION_MODEL,
      inputTokens: 1200,
      outputTokens: 300,
    });
  });

  it("利用量の記録に失敗しても、生成した結果は返す", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const onUsage = vi.fn(async () => {
      throw new Error("db down");
    });
    const response = await handleConfigGeneration({
      messages: [],
      target,
      stage: "theme_proposal",
      model: createStreamModel(THEMES_JSON),
      onUsage,
    });

    expect(JSON.parse(await response.text()).themes).toHaveLength(2);
    await vi.waitFor(() => expect(onUsage).toHaveBeenCalled());
    consoleError.mockRestore();
  });

  it("質問の提案では、確定テーマを議題向けのプロンプトに入れる", async () => {
    const model = createStreamModel(
      JSON.stringify({ text: "質問です", questions: [] })
    );
    const response = await handleConfigGeneration({
      messages: [],
      target,
      stage: "question_proposal",
      confirmedThemes: ["除雪の時間帯"],
      model,
    });
    await response.text();

    const { system, user } = readPrompt(model);
    expect(system).toContain("## 確定テーマ\n- 除雪の時間帯");
    expect(user).toBe("確定したテーマに基づいて、質問を提案してください。");
  });
});
