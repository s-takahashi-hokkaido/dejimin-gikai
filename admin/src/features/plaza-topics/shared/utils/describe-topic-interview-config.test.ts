import { describe, expect, it } from "vitest";
import { describeTopicInterviewConfig } from "./describe-topic-interview-config";

describe("describeTopicInterviewConfig", () => {
  it("設定が無ければ、オープンに質問が要ることを伝える", () => {
    expect(describeTopicInterviewConfig(null)).toBe(
      "まだありません。オープンするには、インタビューの質問が必要です。"
    );
  });

  it("テーマ・質問の数と目安時間を出す", () => {
    expect(
      describeTopicInterviewConfig({
        themesCount: 2,
        questionsCount: 5,
        estimatedDuration: 15,
        hasResponses: false,
      })
    ).toBe("テーマ 2件・質問 5件・目安 15分");
  });

  it("目安時間が無ければ出さない", () => {
    expect(
      describeTopicInterviewConfig({
        themesCount: 0,
        questionsCount: 0,
        estimatedDuration: null,
        hasResponses: false,
      })
    ).toBe("テーマ 0件・質問 0件");
  });
});
