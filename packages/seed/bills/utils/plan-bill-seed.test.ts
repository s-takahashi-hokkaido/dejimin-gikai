import { describe, expect, it } from "vitest";
import type { SeedBill, SeedSession } from "../../main/sapporo-bills/types";
import {
  billKey,
  buildBillInsert,
  buildBillUpdate,
  buildChildRows,
  buildSessionRow,
  collectMasterReferences,
  findMissingMasters,
  hasMissingMasters,
  normalizeExistingBill,
  normalizeTimestamp,
  selectNewRows,
} from "./plan-bill-seed";

function makeBill(overrides: Partial<SeedBill> = {}): SeedBill {
  return {
    billNumber: "議案第1号",
    billType: "bill",
    name: "令和８年度札幌市一般会計予算",
    sourceUrl: "https://example.com/1.pdf",
    status: "approved",
    statusNote: null,
    publishedAt: "2026-03-01T00:00:00+09:00",
    isFeatured: true,
    committees: ["総務委員会"],
    againstFactions: ["日本共産党"],
    tags: ["財政"],
    contents: {
      normal: { title: "やさしい", summary: "やさしい要約", content: "本文" },
      hard: { title: "くわしい", summary: "くわしい要約", content: "本文" },
    },
    ...overrides,
  };
}

function makeSession(bills: SeedBill[]): SeedSession {
  return {
    slug: "r8-1",
    name: "令和8年 第1回定例会（2・3月）",
    startDate: "2026-02-12",
    endDate: "2026-03-27",
    councilUrl: "https://example.com/r8-1",
    isActive: false,
    bills,
  };
}

describe("billKey", () => {
  it("議案番号と種別を組み合わせる", () => {
    expect(billKey("議案第1号", "bill")).toBe("議案第1号|bill");
  });

  it("番号が同じでも種別が違えば別のキーになる", () => {
    expect(billKey("第1号", "bill")).not.toBe(billKey("第1号", "petition"));
  });
});

describe("buildSessionRow", () => {
  it("SeedSession を council_sessions の行に写す", () => {
    expect(buildSessionRow(makeSession([]))).toEqual({
      slug: "r8-1",
      name: "令和8年 第1回定例会（2・3月）",
      start_date: "2026-02-12",
      end_date: "2026-03-27",
      council_url: "https://example.com/r8-1",
      is_active: false,
    });
  });
});

describe("buildBillInsert", () => {
  it("新規は publish_status と is_featured も入れる", () => {
    const row = buildBillInsert(makeBill(), "session-1");
    expect(row).toMatchObject({
      council_session_id: "session-1",
      bill_number: "議案第1号",
      bill_type: "bill",
      name: "令和８年度札幌市一般会計予算",
      status: "approved",
      publish_status: "published",
      is_featured: true,
    });
  });

  it("isFeatured が false ならそのまま入る", () => {
    expect(buildBillInsert(makeBill({ isFeatured: false }), "s").is_featured).toBe(
      false,
    );
  });
});

describe("buildBillUpdate", () => {
  const row = buildBillUpdate(makeBill());

  it("議会の一次情報だけを持つ", () => {
    expect(Object.keys(row).sort()).toEqual([
      "name",
      "published_at",
      "source_url",
      "status",
      "status_note",
    ]);
  });

  it.each([
    "publish_status",
    "is_featured",
    "thumbnail_url",
    "share_thumbnail_url",
    "discussion_overview_points",
    "council_session_id",
    "bill_number",
    "bill_type",
  ])("管理画面が持つ %s は上書きしない", (column) => {
    expect(row).not.toHaveProperty(column);
  });

  it("statusNote が null でもそのまま渡す（DB の値を消せるように）", () => {
    expect(buildBillUpdate(makeBill({ statusNote: null })).status_note).toBeNull();
  });
});

describe("collectMasterReferences", () => {
  it("委員会・会派・タグを重複なく並べる", () => {
    const sessions = [
      makeSession([
        makeBill({ committees: ["総務委員会"], tags: ["財政"], againstFactions: ["A"] }),
        makeBill({
          billNumber: "議案第2号",
          committees: ["総務委員会", "厚生委員会"],
          tags: ["財政", "福祉"],
          againstFactions: ["A", "B"],
        }),
      ]),
    ];
    expect(collectMasterReferences(sessions)).toEqual({
      committees: ["厚生委員会", "総務委員会"],
      factions: ["A", "B"],
      tags: ["福祉", "財政"],
    });
  });

  it("議案が無ければ空", () => {
    expect(collectMasterReferences([makeSession([])])).toEqual({
      committees: [],
      factions: [],
      tags: [],
    });
  });
});

describe("findMissingMasters / hasMissingMasters", () => {
  const references = {
    committees: ["総務委員会", "厚生委員会"],
    factions: ["A"],
    tags: ["財政"],
  };

  it("DB に揃っていれば空を返す", () => {
    const missing = findMissingMasters(references, {
      committees: ["総務委員会", "厚生委員会", "使わない委員会"],
      factions: ["A", "B"],
      tags: ["財政", "福祉"],
    });
    expect(missing).toEqual({ committees: [], factions: [], tags: [] });
    expect(hasMissingMasters(missing)).toBe(false);
  });

  it("足りないものだけを返す", () => {
    const missing = findMissingMasters(references, {
      committees: ["総務委員会"],
      factions: [],
      tags: ["財政"],
    });
    expect(missing).toEqual({
      committees: ["厚生委員会"],
      factions: ["A"],
      tags: [],
    });
    expect(hasMissingMasters(missing)).toBe(true);
  });
});

describe("buildChildRows", () => {
  const committeeIdByName = new Map([["総務委員会", "c1"]]);
  const tagIdByLabel = new Map([["財政", "t1"]]);
  const factions = [
    { id: "f1", name: "自民党" },
    { id: "f2", name: "日本共産党" },
  ];
  const billIdOf = () => "b1";

  it("解説は normal と hard の2件を作る", () => {
    const { contents } = buildChildRows({
      session: makeSession([makeBill()]),
      billIdOf,
      committeeIdByName,
      tagIdByLabel,
      factions,
    });
    expect(contents).toEqual([
      {
        bill_id: "b1",
        difficulty_level: "normal",
        title: "やさしい",
        summary: "やさしい要約",
        content: "本文",
      },
      {
        bill_id: "b1",
        difficulty_level: "hard",
        title: "くわしい",
        summary: "くわしい要約",
        content: "本文",
      },
    ]);
  });

  it("反対会派以外は賛成として全会派分を作る", () => {
    const { stances } = buildChildRows({
      session: makeSession([makeBill({ againstFactions: ["日本共産党"] })]),
      billIdOf,
      committeeIdByName,
      tagIdByLabel,
      factions,
    });
    expect(stances).toEqual([
      { bill_id: "b1", faction_id: "f1", type: "for" },
      { bill_id: "b1", faction_id: "f2", type: "against" },
    ]);
  });

  it("採決が無い status の議案には会派賛否を作らない", () => {
    const { stances } = buildChildRows({
      session: makeSession([makeBill({ status: "in_committee" })]),
      billIdOf,
      committeeIdByName,
      tagIdByLabel,
      factions,
    });
    expect(stances).toEqual([]);
  });

  it("委員会とタグを ID に置き換える", () => {
    const rows = buildChildRows({
      session: makeSession([makeBill()]),
      billIdOf,
      committeeIdByName,
      tagIdByLabel,
      factions,
    });
    expect(rows.committees).toEqual([{ bill_id: "b1", committee_id: "c1" }]);
    expect(rows.tags).toEqual([{ bill_id: "b1", tag_id: "t1" }]);
  });

  it("マスタに無い委員会があれば落とす", () => {
    expect(() =>
      buildChildRows({
        session: makeSession([makeBill({ committees: ["知らない委員会"] })]),
        billIdOf,
        committeeIdByName,
        tagIdByLabel,
        factions,
      }),
    ).toThrow(/委員会がマスタにありません: 知らない委員会/);
  });

  it("マスタに無い会派があれば落とす", () => {
    expect(() =>
      buildChildRows({
        session: makeSession([makeBill({ againstFactions: ["知らない会派"] })]),
        billIdOf,
        committeeIdByName,
        tagIdByLabel,
        factions,
      }),
    ).toThrow(/会派がマスタにありません: 知らない会派/);
  });

  it("マスタに無いタグがあれば落とす", () => {
    expect(() =>
      buildChildRows({
        session: makeSession([makeBill({ tags: ["知らないタグ"] })]),
        billIdOf,
        committeeIdByName,
        tagIdByLabel,
        factions,
      }),
    ).toThrow(/タグがマスタにありません: 知らないタグ/);
  });
});

describe("selectNewRows", () => {
  const keyOf = (row: { k: string }) => row.k;

  it("既にあるものを除く", () => {
    expect(
      selectNewRows([{ k: "a" }, { k: "b" }], new Set(["a"]), keyOf),
    ).toEqual({ inserts: [{ k: "b" }], skipped: 1 });
  });

  it("全部あれば空", () => {
    expect(
      selectNewRows([{ k: "a" }], new Set(["a"]), keyOf),
    ).toEqual({ inserts: [], skipped: 1 });
  });

  it("既存が無ければ全部入れる", () => {
    expect(selectNewRows([{ k: "a" }], new Set(), keyOf)).toEqual({
      inserts: [{ k: "a" }],
      skipped: 0,
    });
  });
});

describe("normalizeTimestamp / normalizeExistingBill", () => {
  it("タイムゾーン表記が違っても同じ瞬間なら同じ文字列になる", () => {
    expect(normalizeTimestamp("2026-03-01T00:00:00+09:00")).toBe(
      normalizeTimestamp("2026-02-28T15:00:00+00:00"),
    );
  });

  it("UTC の ISO 文字列にする", () => {
    expect(normalizeTimestamp("2026-03-01T00:00:00+09:00")).toBe(
      "2026-02-28T15:00:00.000Z",
    );
  });

  it("null・空文字・数値はそのまま返す", () => {
    expect(normalizeTimestamp(null)).toBeNull();
    expect(normalizeTimestamp("")).toBe("");
    expect(normalizeTimestamp(123)).toBe(123);
  });

  it("日付として読めない文字列はそのまま返す（人に気付かせる）", () => {
    expect(normalizeTimestamp("あとで")).toBe("あとで");
  });

  it("buildBillUpdate の published_at も揃った形になる", () => {
    expect(buildBillUpdate(makeBill()).published_at).toBe(
      "2026-02-28T15:00:00.000Z",
    );
  });

  it("既存行の published_at だけを揃え、他の列は触らない", () => {
    expect(
      normalizeExistingBill({
        id: "b1",
        name: "議案",
        published_at: "2026-02-28T15:00:00+00:00",
      }),
    ).toEqual({
      id: "b1",
      name: "議案",
      published_at: "2026-02-28T15:00:00.000Z",
    });
  });

  it("published_at を持たない行はそのまま返す", () => {
    expect(normalizeExistingBill({ id: "b1" })).toEqual({ id: "b1" });
  });
});
