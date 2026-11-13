import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { adminClient } from "../utils";

/**
 * get_ai_usage_cost_usd: サイト全体の合計には、管理画面の議題のインタビュー設定の AI 生成を数えない
 * （マイグレーション 20261113120000）
 */

const FROM = "2030-01-01T00:00:00.000Z";
const TO = "2030-01-02T00:00:00.000Z";
const IN_RANGE = "2030-01-01T03:00:00.000Z";

const userIds: string[] = [];

async function insertEvent(values: {
  userId: string;
  promptName: string | null;
  costUsd: number;
  occurredAt?: string;
}) {
  const { error } = await adminClient.from("chat_usage_events").insert({
    user_id: values.userId,
    prompt_name: values.promptName,
    model: "gpt-5.2",
    cost_usd: values.costUsd,
    occurred_at: values.occurredAt ?? IN_RANGE,
  });
  expect(error).toBeNull();
}

async function sum(targetUserId?: string) {
  const { data, error } = await adminClient.rpc("get_ai_usage_cost_usd", {
    from_ts: FROM,
    to_ts: TO,
    ...(targetUserId ? { target_user_id: targetUserId } : {}),
  });
  expect(error).toBeNull();
  return Number(data);
}

afterEach(async () => {
  if (userIds.length > 0) {
    await adminClient.from("chat_usage_events").delete().in("user_id", userIds);
    userIds.length = 0;
  }
});

describe("get_ai_usage_cost_usd", () => {
  it("全体の合計に、設定の AI 生成を数えない。利用者ごとの合計には数える", async () => {
    const citizen = randomUUID();
    const author = randomUUID();
    userIds.push(citizen, author);
    const before = await sum();

    await insertEvent({
      userId: citizen,
      promptName: "interview",
      costUsd: 0.25,
    });
    await insertEvent({ userId: citizen, promptName: null, costUsd: 0.5 });
    await insertEvent({
      userId: author,
      promptName: "interview_config_generation",
      costUsd: 2,
    });

    expect((await sum()) - before).toBeCloseTo(0.75);
    expect(await sum(citizen)).toBeCloseTo(0.75);
    expect(await sum(author)).toBeCloseTo(2);
  });

  it("期間の外の記録は数えない", async () => {
    const author = randomUUID();
    userIds.push(author);
    await insertEvent({
      userId: author,
      promptName: "interview_config_generation",
      costUsd: 1,
      occurredAt: TO,
    });

    expect(await sum(author)).toBe(0);
  });
});
