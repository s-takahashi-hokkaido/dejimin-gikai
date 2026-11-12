import { describe, expect, it } from "vitest";
import { plazaSeedAccounts, plazaTopicFixtures } from "../plaza-topics";
import {
  buildTopicTimestamps,
  PLAZA_SEED_OPEN_DAYS,
  type PlazaSeedAuthor,
  type PlazaTopicFixture,
  planPlazaTopicSeed,
} from "./plan-plaza-topic-seed";

const NOW = new Date("2026-11-12T03:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): string {
  return new Date(NOW.getTime() + days * DAY_MS).toISOString();
}

const legislator: PlazaSeedAuthor = {
  userId: "00000000-0000-0000-0000-00000000000a",
  displayName: "議員A",
  role: "legislator",
  factionDisplayName: "会派X",
};
const candidate: PlazaSeedAuthor = {
  userId: "00000000-0000-0000-0000-00000000000c",
  displayName: "候補者C",
  role: "candidate",
  factionDisplayName: null,
};
const authors = new Map([
  ["a@example.com", legislator],
  ["c@example.com", candidate],
]);

const interview = {
  themes: ["テーマ"],
  estimatedDuration: 10,
  questions: [
    { question: "質問1", followUpGuide: "深掘り1", quickReplies: ["はい"] },
    { question: "質問2", followUpGuide: null, quickReplies: null },
  ],
};

function makeFixture(
  overrides: Partial<PlazaTopicFixture> = {}
): PlazaTopicFixture {
  return {
    authorEmail: "a@example.com",
    title: "議題",
    bodyMd: "本文",
    state: { status: "open", openedDaysAgo: 3 },
    interview,
    ...overrides,
  };
}

describe("buildTopicTimestamps", () => {
  it("下書きはオープン・クローズの日時を持たない", () => {
    expect(
      buildTopicTimestamps({ status: "draft", createdDaysAgo: 2 }, NOW)
    ).toEqual({
      status: "draft",
      created_at: daysFromNow(-2),
      opened_at: null,
      closes_at: null,
      closed_at: null,
      closed_reason: null,
    });
  });

  it("オープンは期限をオープンから設定値の日数後にし、作成をその1日前にする", () => {
    expect(
      buildTopicTimestamps({ status: "open", openedDaysAgo: 3 }, NOW)
    ).toEqual({
      status: "open",
      created_at: daysFromNow(-4),
      opened_at: daysFromNow(-3),
      closes_at: daysFromNow(-3 + PLAZA_SEED_OPEN_DAYS),
      closed_at: null,
      closed_reason: null,
    });
  });

  it("期限が過ぎたオープンは作らない", () => {
    expect(() =>
      buildTopicTimestamps({ status: "open", openedDaysAgo: 30 }, NOW)
    ).toThrow("期限が過ぎています");
  });

  it("作成者のクローズは、オープンから指定の日数後をクローズ日時にする", () => {
    expect(
      buildTopicTimestamps(
        {
          status: "closed",
          openedDaysAgo: 60,
          closedReason: "manual",
          closedAfterDays: 21,
        },
        NOW
      )
    ).toEqual({
      status: "closed",
      created_at: daysFromNow(-61),
      opened_at: daysFromNow(-60),
      closes_at: daysFromNow(-60 + PLAZA_SEED_OPEN_DAYS),
      closed_at: daysFromNow(-60 + 21),
      closed_reason: "manual",
    });
  });

  it("期限切れのクローズは、期限をクローズ日時にする", () => {
    const result = buildTopicTimestamps(
      { status: "closed", openedDaysAgo: 45, closedReason: "expired" },
      NOW
    );
    expect(result.closed_at).toBe(result.closes_at);
    expect(result.closed_reason).toBe("expired");
  });

  it("作成者のクローズに日数が無い、またはクローズが期限より後なら例外", () => {
    expect(() =>
      buildTopicTimestamps(
        { status: "closed", openedDaysAgo: 60, closedReason: "manual" },
        NOW
      )
    ).toThrow("closedAfterDays");
    expect(() =>
      buildTopicTimestamps(
        {
          status: "closed",
          openedDaysAgo: 60,
          closedReason: "manual",
          closedAfterDays: 31,
        },
        NOW
      )
    ).toThrow("期限より後");
  });

  it("期限切れのクローズで、期限がまだ来ていなければ例外", () => {
    expect(() =>
      buildTopicTimestamps(
        { status: "closed", openedDaysAgo: 10, closedReason: "expired" },
        NOW
      )
    ).toThrow("現在または期限より後");
  });
});

describe("planPlazaTopicSeed", () => {
  it("公開した議題（オープン・クローズ）には作成者の写しを入れる", () => {
    const [planned] = planPlazaTopicSeed({
      fixtures: [makeFixture()],
      authors,
      now: NOW,
    });
    expect(planned.topic).toMatchObject({
      author_user_id: legislator.userId,
      title: "議題",
      body_md: "本文",
      status: "open",
      author_display_name: "議員A",
      author_role: "legislator",
      author_faction_name: "会派X",
    });
  });

  it("候補者の写しは会派を持たない", () => {
    const [planned] = planPlazaTopicSeed({
      fixtures: [
        makeFixture({
          authorEmail: "c@example.com",
          state: {
            status: "closed",
            openedDaysAgo: 45,
            closedReason: "expired",
          },
        }),
      ],
      authors,
      now: NOW,
    });
    expect(planned.topic).toMatchObject({
      author_display_name: "候補者C",
      author_role: "candidate",
      author_faction_name: null,
    });
  });

  it("下書きには写しを入れない", () => {
    const [planned] = planPlazaTopicSeed({
      fixtures: [
        makeFixture({
          state: { status: "draft", createdDaysAgo: 1 },
          interview: null,
        }),
      ],
      authors,
      now: NOW,
    });
    expect(planned.topic).toMatchObject({
      author_user_id: legislator.userId,
      author_display_name: null,
      author_role: null,
      author_faction_name: null,
    });
    expect(planned.interview).toBeNull();
  });

  it("インタビュー設定は status を入れず、質問に1からの順番を振る", () => {
    const [planned] = planPlazaTopicSeed({
      fixtures: [makeFixture()],
      authors,
      now: NOW,
    });
    expect(planned.interview?.config).toEqual({
      name: "デフォルト設定",
      mode: "loop",
      themes: ["テーマ"],
      estimated_duration: 10,
    });
    expect(planned.interview?.questions).toEqual([
      {
        question: "質問1",
        follow_up_guide: "深掘り1",
        quick_replies: ["はい"],
        question_order: 1,
      },
      {
        question: "質問2",
        follow_up_guide: null,
        quick_replies: null,
        question_order: 2,
      },
    ]);
  });

  it("同じ作成者のオープンが2つあれば例外", () => {
    expect(() =>
      planPlazaTopicSeed({
        fixtures: [makeFixture(), makeFixture({ title: "別の議題" })],
        authors,
        now: NOW,
      })
    ).toThrow("1人1つまで");
  });

  it("オープン・クローズの議題にインタビュー設定が無ければ例外", () => {
    expect(() =>
      planPlazaTopicSeed({
        fixtures: [makeFixture({ interview: null })],
        authors,
        now: NOW,
      })
    ).toThrow("インタビュー設定が必要");
  });

  it("作成者が見つからなければ例外", () => {
    expect(() =>
      planPlazaTopicSeed({
        fixtures: [makeFixture({ authorEmail: "unknown@example.com" })],
        authors,
        now: NOW,
      })
    ).toThrow("作成者が見つかりません");
  });
});

describe("plaza-topics.ts の seed データ", () => {
  const seedAuthors = new Map(
    plazaSeedAccounts.map((account, index) => [
      account.email,
      {
        userId: `00000000-0000-0000-0000-00000000000${index}`,
        displayName: account.displayName,
        role: account.role,
        factionDisplayName: account.factionName ? "会派" : null,
      },
    ])
  );

  it("組み立てられる（作成者・オープンの数・設定の有無・日時の規則を満たす）", () => {
    const planned = planPlazaTopicSeed({
      fixtures: plazaTopicFixtures,
      authors: seedAuthors,
      now: NOW,
    });
    expect(planned).toHaveLength(plazaTopicFixtures.length);
  });

  it("下書き・オープン・クローズをそれぞれ2件以上含む", () => {
    const count = (status: string) =>
      plazaTopicFixtures.filter((f) => f.state.status === status).length;
    expect(count("draft")).toBeGreaterThanOrEqual(2);
    expect(count("open")).toBeGreaterThanOrEqual(2);
    expect(count("closed")).toBeGreaterThanOrEqual(2);
  });

  it("公開した議題は本文が空でない（DB の CHECK 制約と同じ）", () => {
    for (const fixture of plazaTopicFixtures) {
      if (fixture.state.status !== "draft") {
        expect(fixture.bodyMd.trim()).not.toBe("");
      }
    }
  });

  it("議員は会派を持ち、候補者は持たない", () => {
    for (const account of plazaSeedAccounts) {
      expect(account.factionName !== null).toBe(account.role === "legislator");
    }
  });
});
