import { describe, expect, it } from "vitest";
import type { PlazaTopicRow } from "../types/plaza-topic";
import { resolveTopicAuthor, toPlazaTopic } from "./to-plaza-topic";

const LIVE_PROFILE = {
  display_name: "サンプル議員A（改名後）",
  role: "legislator",
  faction: { display_name: "改称後の会派" },
};

function buildRow(overrides: Partial<PlazaTopicRow> = {}): PlazaTopicRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    author_user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    title: "冬の除雪について",
    body_md: "## 聞きたいこと",
    status: "draft",
    opened_at: null,
    closes_at: null,
    closed_at: null,
    closed_reason: null,
    author_display_name: null,
    author_role: null,
    author_faction_name: null,
    withdrawn_at: null,
    withdrawn_reason: null,
    created_at: "2026-11-01T00:00:00+00:00",
    updated_at: "2026-11-02T00:00:00+00:00",
    author: LIVE_PROFILE,
    ...overrides,
  };
}

const PUBLISHED_SNAPSHOT = {
  opened_at: "2026-11-03T00:00:00+00:00",
  closes_at: "2026-12-03T00:00:00+00:00",
  author_display_name: "サンプル議員A",
  author_role: "legislator",
  author_faction_name: "オープン時の会派",
} as const;

describe("resolveTopicAuthor", () => {
  it("下書きは作成者の現在のプロフィールを出す", () => {
    expect(resolveTopicAuthor({ ...buildRow(), status: "draft" })).toEqual({
      displayName: "サンプル議員A（改名後）",
      role: "legislator",
      factionName: "改称後の会派",
    });
  });

  it.each([
    "open",
    "closed",
  ] as const)("公開した議題はオープン時点の写しを出す（K7）: %s", (status) => {
    const row = buildRow({ ...PUBLISHED_SNAPSHOT, status });
    expect(resolveTopicAuthor({ ...row, status })).toEqual({
      displayName: "サンプル議員A",
      role: "legislator",
      factionName: "オープン時の会派",
    });
  });

  it("公開した議題は、アカウントを削除しても写しで出す", () => {
    const row = buildRow({
      ...PUBLISHED_SNAPSHOT,
      status: "closed",
      author_user_id: null,
      author: null,
    });
    expect(resolveTopicAuthor({ ...row, status: "closed" })?.displayName).toBe(
      "サンプル議員A"
    );
  });

  it("出馬者は会派なし", () => {
    const row = buildRow({
      author: {
        display_name: "サンプル候補者C",
        role: "candidate",
        faction: null,
      },
    });
    expect(resolveTopicAuthor({ ...row, status: "draft" })).toEqual({
      displayName: "サンプル候補者C",
      role: "candidate",
      factionName: null,
    });
  });

  it("未知のロールは null にする", () => {
    const row = buildRow({
      author: { display_name: "名前", role: "unknown", faction: null },
    });
    expect(resolveTopicAuthor({ ...row, status: "draft" })?.role).toBeNull();
  });

  it("アカウントを削除した人の下書きは作成者不明（null）", () => {
    const row = buildRow({ author_user_id: null, author: null });
    expect(resolveTopicAuthor({ ...row, status: "draft" })).toBeNull();
  });
});

describe("toPlazaTopic", () => {
  it("DB の行を画面で扱う形にする", () => {
    expect(toPlazaTopic(buildRow())).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      authorUserId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      title: "冬の除雪について",
      bodyMd: "## 聞きたいこと",
      status: "draft",
      openedAt: null,
      closesAt: null,
      closedAt: null,
      withdrawnAt: null,
      createdAt: "2026-11-01T00:00:00+00:00",
      updatedAt: "2026-11-02T00:00:00+00:00",
      author: {
        displayName: "サンプル議員A（改名後）",
        role: "legislator",
        factionName: "改称後の会派",
      },
    });
  });

  it("未知の状態はエラーにする", () => {
    expect(() => toPlazaTopic(buildRow({ status: "withdrawn" }))).toThrow(
      "議題の状態が不正です: withdrawn"
    );
  });
});
