import { describe, expect, it } from "vitest";
import { isTopicStatus, TOPIC_STATUS_LABELS } from "./topic-status";

describe("isTopicStatus", () => {
  it.each([
    "draft",
    "open",
    "closed",
  ])("既知の状態を受け入れる: %s", (value) => {
    expect(isTopicStatus(value)).toBe(true);
  });

  it.each([
    "withdrawn",
    "",
    "OPEN",
    null,
    undefined,
    1,
  ])("未知の値は false: %s", (value) => {
    expect(isTopicStatus(value)).toBe(false);
  });
});

describe("TOPIC_STATUS_LABELS", () => {
  it("すべての状態に表示名がある", () => {
    expect(TOPIC_STATUS_LABELS).toEqual({
      draft: "下書き",
      open: "オープン中",
      closed: "クローズ済み",
    });
  });
});
