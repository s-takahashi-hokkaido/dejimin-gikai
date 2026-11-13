import { describe, expect, it } from "vitest";
import type { TopicStatus } from "../types/plaza-topic";
import {
  canCreateTopic,
  canDeleteTopic,
  canEditTopic,
  canViewTopic,
  isOwnTopic,
  type TopicActor,
  validateTopicDeletion,
  validateTopicEdit,
} from "./topic-permissions";

const LEGISLATOR_A: TopicActor = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  role: "legislator",
};
const LEGISLATOR_B: TopicActor = {
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  role: "legislator",
};
const CANDIDATE_C: TopicActor = {
  id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  role: "candidate",
};
const OPERATOR: TopicActor = {
  id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  role: "admin",
};

function topicOf(author: TopicActor | null, status: TopicStatus) {
  return { authorUserId: author?.id ?? null, status };
}

describe("canCreateTopic", () => {
  it("議員と出馬者は議題を出せる", () => {
    expect(canCreateTopic("legislator")).toBe(true);
    expect(canCreateTopic("candidate")).toBe(true);
  });

  it("運営者は議題を出せない（K3）", () => {
    expect(canCreateTopic("admin")).toBe(false);
  });
});

describe("isOwnTopic", () => {
  it("作成者本人なら true", () => {
    expect(isOwnTopic(LEGISLATOR_A, topicOf(LEGISLATOR_A, "draft"))).toBe(true);
  });

  it("ほかの人の議題なら false", () => {
    expect(isOwnTopic(LEGISLATOR_B, topicOf(LEGISLATOR_A, "draft"))).toBe(
      false
    );
  });

  it("作成者のアカウントが削除された議題は、誰の議題でもない", () => {
    expect(isOwnTopic(LEGISLATOR_A, topicOf(null, "draft"))).toBe(false);
  });
});

describe("canViewTopic", () => {
  it.each([
    "draft",
    "open",
    "closed",
  ] as const)("自分の議題はどの状態でも見られる: %s", (status) => {
    expect(canViewTopic(CANDIDATE_C, topicOf(CANDIDATE_C, status))).toBe(true);
  });

  it.each([
    "open",
    "closed",
  ] as const)("ほかの人のオープン中・クローズ済みの議題を見られる（K1）: %s", (status) => {
    expect(canViewTopic(LEGISLATOR_B, topicOf(LEGISLATOR_A, status))).toBe(
      true
    );
    expect(canViewTopic(CANDIDATE_C, topicOf(LEGISLATOR_A, status))).toBe(true);
  });

  it("ほかの人の下書きは見えない", () => {
    expect(canViewTopic(LEGISLATOR_B, topicOf(LEGISLATOR_A, "draft"))).toBe(
      false
    );
    expect(canViewTopic(CANDIDATE_C, topicOf(LEGISLATOR_A, "draft"))).toBe(
      false
    );
  });

  it("作成者不明の下書きは、議員・出馬者には見えない", () => {
    expect(canViewTopic(LEGISLATOR_A, topicOf(null, "draft"))).toBe(false);
  });

  it.each([
    "draft",
    "open",
    "closed",
  ] as const)("運営者は全員の議題を見られる: %s", (status) => {
    expect(canViewTopic(OPERATOR, topicOf(LEGISLATOR_A, status))).toBe(true);
    expect(canViewTopic(OPERATOR, topicOf(null, status))).toBe(true);
  });
});

describe.each([
  ["編集", validateTopicEdit, canEditTopic],
  ["削除", validateTopicDeletion, canDeleteTopic],
] as const)("%s", (verb, validate, can) => {
  it("作成者は自分の下書きを変えられる", () => {
    for (const author of [LEGISLATOR_A, CANDIDATE_C]) {
      const topic = topicOf(author, "draft");
      expect(validate(author, topic)).toBeNull();
      expect(can(author, topic)).toBe(true);
    }
  });

  it("ほかの人の議題は変えられない", () => {
    const topic = topicOf(LEGISLATOR_A, "draft");
    expect(validate(LEGISLATOR_B, topic)).toBe(`自分の議題だけ${verb}できます`);
    expect(validate(CANDIDATE_C, topic)).toBe(`自分の議題だけ${verb}できます`);
    expect(can(LEGISLATOR_B, topic)).toBe(false);
  });

  it("作成者不明の議題は誰も変えられない", () => {
    expect(can(LEGISLATOR_A, topicOf(null, "draft"))).toBe(false);
  });

  it("運営者は、自分の議題でなくても変えられない（K3）", () => {
    const topic = topicOf(LEGISLATOR_A, "draft");
    expect(validate(OPERATOR, topic)).toBe(
      `議題を${verb}できるのは議員と出馬者だけです`
    );
    expect(can(OPERATOR, topic)).toBe(false);
  });

  it("運営者になった人は、自分が出した下書きでも変えられない", () => {
    const formerLegislator: TopicActor = { ...LEGISLATOR_A, role: "admin" };
    expect(can(formerLegislator, topicOf(LEGISLATOR_A, "draft"))).toBe(false);
  });

  it.each([
    "open",
    "closed",
  ] as const)("下書きでなければ、自分の議題でも変えられない: %s", (status) => {
    expect(validate(LEGISLATOR_A, topicOf(LEGISLATOR_A, status))).toBe(
      `下書きの議題だけ${verb}できます`
    );
    expect(can(LEGISLATOR_A, topicOf(LEGISLATOR_A, status))).toBe(false);
  });
});
