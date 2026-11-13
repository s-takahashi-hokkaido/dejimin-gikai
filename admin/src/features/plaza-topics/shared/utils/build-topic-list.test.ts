import { describe, expect, it } from "vitest";
import type { PlazaTopicSummary, TopicStatus } from "../types/plaza-topic";
import {
  buildTopicListSections,
  groupTopicsByStatus,
} from "./build-topic-list";
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

function topic(
  id: string,
  status: TopicStatus,
  updatedAt: string,
  authorUserId: string | null = A.id
): PlazaTopicSummary {
  return {
    id,
    authorUserId,
    title: `議題${id}`,
    status,
    openedAt: null,
    closesAt: null,
    closedAt: null,
    withdrawnAt: null,
    createdAt: "2026-11-01T00:00:00+00:00",
    updatedAt,
    author: null,
  };
}

const ids = (groups: { status: TopicStatus; topics: PlazaTopicSummary[] }[]) =>
  groups.map((group) => ({
    status: group.status,
    ids: group.topics.map((t) => t.id),
  }));

describe("groupTopicsByStatus", () => {
  it("オープン中・下書き・クローズ済みの順に分け、それぞれ更新の新しい順に並べる", () => {
    const topics = [
      topic("1", "closed", "2026-11-01T00:00:00+00:00"),
      topic("2", "draft", "2026-11-02T00:00:00+00:00"),
      topic("3", "draft", "2026-11-05T00:00:00+00:00"),
      topic("4", "open", "2026-11-03T00:00:00+00:00"),
      topic("5", "closed", "2026-11-04T00:00:00+00:00"),
    ];
    expect(ids(groupTopicsByStatus(topics))).toEqual([
      { status: "open", ids: ["4"] },
      { status: "draft", ids: ["3", "2"] },
      { status: "closed", ids: ["5", "1"] },
    ]);
  });

  it("タイムゾーンの書き方が違っても、時刻で比べる", () => {
    const topics = [
      topic("1", "draft", "2026-11-02T08:00:00+09:00"),
      topic("2", "draft", "2026-11-02T00:00:01+00:00"),
    ];
    expect(ids(groupTopicsByStatus(topics))).toEqual([
      { status: "draft", ids: ["2", "1"] },
    ]);
  });

  it("同じ時刻なら ID 順にして、開き直しても順序が変わらない（K5）", () => {
    const sameTime = "2026-11-02T00:00:00+00:00";
    const forward = [
      topic("b", "draft", sameTime),
      topic("a", "draft", sameTime),
    ];
    const backward = [...forward].reverse();
    expect(ids(groupTopicsByStatus(forward))).toEqual([
      { status: "draft", ids: ["a", "b"] },
    ]);
    expect(ids(groupTopicsByStatus(backward))).toEqual(
      ids(groupTopicsByStatus(forward))
    );
  });

  it("議題が無い状態は省く", () => {
    expect(groupTopicsByStatus([])).toEqual([]);
  });

  it("元の配列を並べ替えない", () => {
    const topics = [
      topic("1", "draft", "2026-11-01T00:00:00+00:00"),
      topic("2", "draft", "2026-11-02T00:00:00+00:00"),
    ];
    groupTopicsByStatus(topics);
    expect(topics.map((t) => t.id)).toEqual(["1", "2"]);
  });
});

describe("buildTopicListSections", () => {
  const topics = [
    topic("a-draft", "draft", "2026-11-01T00:00:00+00:00", A.id),
    topic("a-open", "open", "2026-11-02T00:00:00+00:00", A.id),
    topic("b-draft", "draft", "2026-11-03T00:00:00+00:00", B.id),
    topic("b-open", "open", "2026-11-04T00:00:00+00:00", B.id),
    topic("b-closed", "closed", "2026-11-05T00:00:00+00:00", B.id),
    topic("orphan-draft", "draft", "2026-11-06T00:00:00+00:00", null),
  ];

  it("議員・出馬者には、自分の議題と、ほかの人のオープン中・クローズ済みを分けて出す", () => {
    const sections = buildTopicListSections(A, topics);
    expect(ids(sections.own)).toEqual([
      { status: "open", ids: ["a-open"] },
      { status: "draft", ids: ["a-draft"] },
    ]);
    expect(ids(sections.others)).toEqual([
      { status: "open", ids: ["b-open"] },
      { status: "closed", ids: ["b-closed"] },
    ]);
  });

  it("ほかの人の下書き（作成者不明を含む）は出さない", () => {
    const sections = buildTopicListSections(A, topics);
    const otherIds = sections.others.flatMap((g) => g.topics.map((t) => t.id));
    expect(otherIds).not.toContain("b-draft");
    expect(otherIds).not.toContain("orphan-draft");
  });

  it("運営者には全員の議題を、下書きも含めて出す", () => {
    const sections = buildTopicListSections(OPERATOR, topics);
    expect(sections.own).toEqual([]);
    expect(ids(sections.others)).toEqual([
      { status: "open", ids: ["b-open", "a-open"] },
      { status: "draft", ids: ["orphan-draft", "b-draft", "a-draft"] },
      { status: "closed", ids: ["b-closed"] },
    ]);
  });
});
