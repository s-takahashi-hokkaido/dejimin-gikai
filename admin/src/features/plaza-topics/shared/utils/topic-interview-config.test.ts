import { describe, expect, it } from "vitest";
import type { TopicStatus } from "../types/plaza-topic";
import {
  buildTopicInterviewConfigRecord,
  normalizeTopicInterviewSettings,
  TOPIC_INTERVIEW_CONFIG_NAME,
  TOPIC_INTERVIEW_DURATION,
  TOPIC_INTERVIEW_THEME_MAX_LENGTH,
  TOPIC_INTERVIEW_THEMES_MAX,
  validateTopicInterviewConfigEdit,
} from "./topic-interview-config";
import type { TopicActor } from "./topic-permissions";

const A: TopicActor = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  role: "legislator",
};
const B: TopicActor = {
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  role: "candidate",
};
const OPERATOR: TopicActor = {
  id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  role: "admin",
};

const topicOf = (author: TopicActor | null, status: TopicStatus) => ({
  authorUserId: author?.id ?? null,
  status,
});

describe("normalizeTopicInterviewSettings", () => {
  it("テーマを整え、空の行と重複を除く", () => {
    expect(
      normalizeTopicInterviewSettings({
        themes: ["  除雪の時間帯 ", "", "除雪の時間帯", "通学路の  安全"],
        estimatedDuration: 10,
      })
    ).toEqual({
      ok: true,
      value: {
        themes: ["除雪の時間帯", "通学路の 安全"],
        estimatedDuration: 10,
      },
    });
  });

  it("テーマは空でもよい（質問だけで進められる）", () => {
    expect(
      normalizeTopicInterviewSettings({ themes: [], estimatedDuration: 10 })
    ).toEqual({ ok: true, value: { themes: [], estimatedDuration: 10 } });
  });

  it("テーマの数と長さの上限を超えたら拒否する", () => {
    const tooMany = Array.from(
      { length: TOPIC_INTERVIEW_THEMES_MAX + 1 },
      (_, i) => `テーマ${i}`
    );
    expect(
      normalizeTopicInterviewSettings({
        themes: tooMany,
        estimatedDuration: 10,
      }).ok
    ).toBe(false);
    expect(
      normalizeTopicInterviewSettings({
        themes: ["あ".repeat(TOPIC_INTERVIEW_THEME_MAX_LENGTH + 1)],
        estimatedDuration: 10,
      }).ok
    ).toBe(false);
  });

  it.each([
    TOPIC_INTERVIEW_DURATION.min,
    TOPIC_INTERVIEW_DURATION.max,
  ])("目安時間は範囲の端も受け入れる: %i", (minutes) => {
    expect(
      normalizeTopicInterviewSettings({
        themes: [],
        estimatedDuration: minutes,
      }).ok
    ).toBe(true);
  });

  it.each([
    TOPIC_INTERVIEW_DURATION.min - 1,
    TOPIC_INTERVIEW_DURATION.max + 1,
    10.5,
    "10",
    null,
    undefined,
  ])("目安時間が範囲外・整数でなければ拒否する: %j", (minutes) => {
    expect(
      normalizeTopicInterviewSettings({
        themes: [],
        estimatedDuration: minutes,
      })
    ).toEqual({
      ok: false,
      error: `目安時間は${TOPIC_INTERVIEW_DURATION.min}〜${TOPIC_INTERVIEW_DURATION.max}分の整数で入力してください`,
    });
  });

  it.each([
    undefined,
    "テーマ",
    [1, 2],
  ])("テーマが文字列の配列でなければ拒否する: %j", (themes) => {
    expect(
      normalizeTopicInterviewSettings({ themes, estimatedDuration: 10 })
    ).toEqual({ ok: false, error: "テーマの形式が正しくありません" });
  });
});

describe("buildTopicInterviewConfigRecord", () => {
  it("作成者が触れない項目を固定する（モード loop・既定のモデル・ナレッジソースなし）", () => {
    expect(
      buildTopicInterviewConfigRecord({
        themes: ["除雪"],
        estimatedDuration: 15,
      })
    ).toEqual({
      name: TOPIC_INTERVIEW_CONFIG_NAME,
      status: "closed",
      mode: "loop",
      chat_model: null,
      knowledge_source: null,
      themes: ["除雪"],
      estimated_duration: 15,
    });
  });

  it("テーマが無ければ null にする", () => {
    expect(
      buildTopicInterviewConfigRecord({ themes: [], estimatedDuration: 10 })
        .themes
    ).toBeNull();
  });
});

describe("validateTopicInterviewConfigEdit", () => {
  const noResponses = { hasResponses: false };

  it("作成者は、自分の下書きの設定を変えられる", () => {
    expect(
      validateTopicInterviewConfigEdit(A, topicOf(A, "draft"), noResponses)
    ).toBeNull();
    expect(
      validateTopicInterviewConfigEdit(B, topicOf(B, "draft"), noResponses)
    ).toBeNull();
  });

  it("ほかの人の議題の設定は変えられない", () => {
    expect(
      validateTopicInterviewConfigEdit(B, topicOf(A, "draft"), noResponses)
    ).toBe("自分の議題のインタビュー設定だけ変更できます");
  });

  it("運営者は変えられない（議案の設定は運営者だけのまま）", () => {
    expect(
      validateTopicInterviewConfigEdit(
        OPERATOR,
        topicOf(A, "draft"),
        noResponses
      )
    ).toBe("インタビュー設定を変更できるのは議員と出馬者だけです");
  });

  it("作成者不明の議題は誰も変えられない", () => {
    expect(
      validateTopicInterviewConfigEdit(A, topicOf(null, "draft"), noResponses)
    ).toBe("自分の議題のインタビュー設定だけ変更できます");
  });

  it.each([
    "open",
    "closed",
  ] as const)("下書きでなければ変えられない: %s", (status) => {
    expect(
      validateTopicInterviewConfigEdit(A, topicOf(A, status), noResponses)
    ).toBe("下書きの議題のインタビュー設定だけ変更できます");
  });

  it("回答が始まった議題の設定は変えられない", () => {
    expect(
      validateTopicInterviewConfigEdit(A, topicOf(A, "draft"), {
        hasResponses: true,
      })
    ).toBe("回答が始まった議題のインタビュー設定は変更できません");
  });
});
