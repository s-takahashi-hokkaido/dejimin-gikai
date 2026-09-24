import {
  adminClient,
  cleanupTestBill,
  cleanupTestUser,
  createTestInterviewData,
  createTestUser,
  type TestUser,
} from "@test-utils/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGenerateMock } from "@/test-utils/mock-language-model";
import { generateInitialQuestion } from "./generate-initial-question";

// interviewChatTextSchema に準拠したモックレスポンス
// LLMのレスポンスはtopic_title: nullだが、overrideInitialTopicTitleにより「はじめに」に上書きされる
const llmResponse = JSON.stringify({
  text: "こんにちは！テストインタビューを始めましょう。最初の質問です。",
  quick_replies: ["はい", "いいえ"],
  question_id: null,
  topic_title: null,
  next_stage: "chat",
});
const expectedResponse = JSON.stringify({
  text: "こんにちは！テストインタビューを始めましょう。最初の質問です。",
  quick_replies: ["はい", "いいえ"],
  question_id: null,
  topic_title: "はじめに",
  next_stage: "chat",
});

describe("generateInitialQuestion 統合テスト", () => {
  let testUser: TestUser;
  let sessionId: string;
  let billId: string;
  let interviewConfigId: string;

  beforeEach(async () => {
    testUser = await createTestUser();
    const data = await createTestInterviewData(testUser.id);
    sessionId = data.session.id;
    billId = data.bill.id;
    interviewConfigId = data.config.id;
  });

  afterEach(async () => {
    await adminClient
      .from("chat_usage_events")
      .delete()
      .eq("user_id", testUser.id);
    await cleanupTestBill(billId);
    await cleanupTestUser(testUser.id);
  });

  it("LLMが生成したテキストがassistantメッセージとしてDBに保存される", async () => {
    const mockModel = createGenerateMock(llmResponse);

    const result = await generateInitialQuestion({
      userId: testUser.id,
      sessionId,
      billId,
      interviewConfigId,
      deps: { model: mockModel },
    });

    // 戻り値を検証
    expect(result).not.toBeNull();
    expect(result?.role).toBe("assistant");
    expect(result?.content).toBe(expectedResponse);

    // DB 状態を検証: assistantメッセージが保存されていること
    const { data: messages } = await adminClient
      .from("interview_messages")
      .select("*")
      .eq("interview_session_id", sessionId)
      .order("created_at", { ascending: true });

    expect(messages).toHaveLength(1);
    expect(messages?.[0].role).toBe("assistant");
    expect(messages?.[0].content).toBe(expectedResponse);
    expect(messages?.[0].interview_session_id).toBe(sessionId);
  });

  it("LLMが空テキストを返した場合はnullを返しDBに保存されない", async () => {
    const mockModel = createGenerateMock("  "); // 空白のみ

    const result = await generateInitialQuestion({
      userId: testUser.id,
      sessionId,
      billId,
      interviewConfigId,
      deps: { model: mockModel },
    });

    // null が返ること
    expect(result).toBeNull();

    // DB 状態を検証: メッセージが保存されていないこと
    const { data: messages } = await adminClient
      .from("interview_messages")
      .select("*")
      .eq("interview_session_id", sessionId);

    expect(messages).toHaveLength(0);
  });

  it("生成に使ったコストを chat_usage_events に記録する", async () => {
    const mockModel = createGenerateMock(llmResponse);

    await generateInitialQuestion({
      userId: testUser.id,
      sessionId,
      billId,
      interviewConfigId,
      deps: { model: mockModel },
    });

    const { data: events } = await adminClient
      .from("chat_usage_events")
      .select("*")
      .eq("user_id", testUser.id);

    expect(events).toHaveLength(1);
    expect(events?.[0].prompt_name).toBe("interview-initial-question");
    expect(events?.[0].session_id).toBe(sessionId);
    expect(events?.[0].metadata).toMatchObject({
      feature: "interview",
      billId,
    });
  });

  it("利用者ごとの上限に達している場合は生成せずnullを返す", async () => {
    // インタビューの1人あたり上限（既定 $0.5）を超え、全体上限（既定 $5）には届かない額
    await adminClient.from("chat_usage_events").insert({
      user_id: testUser.id,
      model: "test-model",
      cost_usd: 1,
    });
    const mockModel = createGenerateMock(llmResponse);

    const result = await generateInitialQuestion({
      userId: testUser.id,
      sessionId,
      billId,
      interviewConfigId,
      deps: { model: mockModel },
    });

    expect(result).toBeNull();

    const { data: messages } = await adminClient
      .from("interview_messages")
      .select("*")
      .eq("interview_session_id", sessionId);

    expect(messages).toHaveLength(0);
  });

  it("interview_configが存在しないbillIdの場合はnullを返す", async () => {
    // 存在しないbillId
    const nonExistentBillId = "00000000-0000-0000-0000-000000000000";
    const mockModel = createGenerateMock(llmResponse);

    const result = await generateInitialQuestion({
      userId: testUser.id,
      sessionId,
      billId: nonExistentBillId,
      interviewConfigId,
      deps: { model: mockModel },
    });

    // interview_config が見つからないためnullが返ること
    expect(result).toBeNull();
  });
});
