import { describe, expect, it } from "vitest";
import {
  diffColumns,
  isSameValue,
  planMasterUpsert,
} from "./plan-master-upsert";

const keyOfName = (row: Record<string, unknown>) => row.name;

describe("isSameValue", () => {
  it("同じプリミティブは等しい", () => {
    expect(isSameValue("総務委員会", "総務委員会")).toBe(true);
    expect(isSameValue(1, 1)).toBe(true);
    expect(isSameValue(true, true)).toBe(true);
  });

  it("違うプリミティブは等しくない", () => {
    expect(isSameValue(1, 2)).toBe(false);
    expect(isSameValue("a", "b")).toBe(false);
    expect(isSameValue(true, false)).toBe(false);
  });

  it("null と undefined は同じ扱いにする", () => {
    expect(isSameValue(null, undefined)).toBe(true);
    expect(isSameValue(undefined, null)).toBe(true);
    expect(isSameValue(null, null)).toBe(true);
  });

  it("null と値は等しくない", () => {
    expect(isSameValue(null, 0)).toBe(false);
    expect(isSameValue(undefined, "")).toBe(false);
  });

  it("配列は要素ごとに比較する", () => {
    expect(isSameValue(["a", "b"], ["a", "b"])).toBe(true);
    expect(isSameValue(["a", "b"], ["b", "a"])).toBe(false);
    expect(isSameValue([], [])).toBe(true);
    expect(isSameValue(["a"], ["a", "b"])).toBe(false);
  });

  it("数値と文字列は等しくない（Postgres から文字列で返った場合に差分として検出する）", () => {
    expect(isSameValue(1, "1")).toBe(false);
  });

  describe("オブジェクト（jsonb カラム）", () => {
    it("構造が同じなら等しい（毎回 update されないように）", () => {
      expect(isSameValue({ a: 1, b: "x" }, { a: 1, b: "x" })).toBe(true);
      expect(isSameValue({ a: 1, b: "x" }, { b: "x", a: 1 })).toBe(true);
      expect(isSameValue({}, {})).toBe(true);
    });

    it("値が違えば等しくない", () => {
      expect(isSameValue({ a: 1 }, { a: 2 })).toBe(false);
    });

    it("キーの数が違えば等しくない", () => {
      expect(isSameValue({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("入れ子も比較する", () => {
      expect(isSameValue({ a: { b: [1, 2] } }, { a: { b: [1, 2] } })).toBe(
        true,
      );
      expect(isSameValue({ a: { b: [1, 2] } }, { a: { b: [2, 1] } })).toBe(
        false,
      );
    });

    it("オブジェクトと配列は等しくない", () => {
      expect(isSameValue({ 0: "a" }, ["a"])).toBe(false);
    });
  });
});

describe("diffColumns", () => {
  it("desired が持つカラムだけを比較する", () => {
    const changed = diffColumns(
      { name: "総務委員会", sort_order: 1 },
      {
        name: "総務委員会",
        sort_order: 1,
        created_at: "2026-01-01T00:00:00Z",
      },
    );
    expect(changed).toEqual([]);
  });

  it("値が違うカラム名を返す", () => {
    const changed = diffColumns(
      { name: "総務委員会", sort_order: 1, is_active: true },
      { name: "総務委員会", sort_order: 5, is_active: false },
    );
    expect(changed).toEqual(["sort_order", "is_active"]);
  });

  it("既存行に無いカラムは差分になる", () => {
    expect(diffColumns({ description: "説明" }, {})).toEqual(["description"]);
  });

  it("desired が null で既存が null なら差分にならない", () => {
    expect(diffColumns({ description: null }, { description: null })).toEqual(
      [],
    );
  });
});

describe("planMasterUpsert", () => {
  describe("既存データが無い場合", () => {
    it("すべて insert になる", () => {
      const plan = planMasterUpsert({
        table: "factions",
        desired: [
          { name: "自由民主党", sort_order: 1 },
          { name: "公明党", sort_order: 2 },
        ],
        existing: [],
        keyOf: keyOfName,
      });

      expect(plan.inserts).toHaveLength(2);
      expect(plan.updates).toEqual([]);
      expect(plan.unchangedKeys).toEqual([]);
      expect(plan.extraKeys).toEqual([]);
    });
  });

  describe("2回目の実行（同じデータが既に入っている）", () => {
    it("insert も update も発生しない（冪等）", () => {
      const desired = [
        { name: "自由民主党", display_name: "自由民主党", sort_order: 1 },
        { name: "公明党", display_name: "公明党", sort_order: 2 },
      ];
      const plan = planMasterUpsert({
        table: "factions",
        desired,
        existing: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            name: "自由民主党",
            display_name: "自由民主党",
            sort_order: 1,
            created_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "22222222-2222-2222-2222-222222222222",
            name: "公明党",
            display_name: "公明党",
            sort_order: 2,
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        keyOf: keyOfName,
      });

      expect(plan.inserts).toEqual([]);
      expect(plan.updates).toEqual([]);
      expect(plan.unchangedKeys).toEqual(["自由民主党", "公明党"]);
      expect(plan.extraKeys).toEqual([]);
    });
  });

  describe("既存データの一部が違う場合", () => {
    it("違う行だけ update になり、変更カラムを返す", () => {
      const plan = planMasterUpsert({
        table: "factions",
        desired: [
          { name: "自由民主党", sort_order: 1, is_active: true },
          { name: "公明党", sort_order: 3, is_active: true },
        ],
        existing: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            name: "自由民主党",
            sort_order: 1,
            is_active: true,
          },
          {
            id: "22222222-2222-2222-2222-222222222222",
            name: "公明党",
            sort_order: 2,
            is_active: true,
          },
        ],
        keyOf: keyOfName,
      });

      expect(plan.inserts).toEqual([]);
      expect(plan.unchangedKeys).toEqual(["自由民主党"]);
      expect(plan.updates).toEqual([
        {
          id: "22222222-2222-2222-2222-222222222222",
          key: "公明党",
          row: { name: "公明党", sort_order: 3, is_active: true },
          changedColumns: ["sort_order"],
        },
      ]);
    });

    it("新規と更新と変更なしが混在しても振り分けられる", () => {
      const plan = planMasterUpsert({
        table: "committees",
        desired: [
          { name: "第一部決算特別委員会", sort_order: 13 },
          { name: "第二部決算特別委員会", sort_order: 14 },
          { name: "総務委員会", sort_order: 1 },
        ],
        existing: [
          { id: "aaaa", name: "第一部決算特別委員会", sort_order: 13 },
          { id: "bbbb", name: "総務委員会", sort_order: 99 },
        ],
        keyOf: keyOfName,
      });

      expect(plan.inserts).toEqual([
        { name: "第二部決算特別委員会", sort_order: 14 },
      ]);
      expect(plan.updates.map((u) => u.key)).toEqual(["総務委員会"]);
      expect(plan.unchangedKeys).toEqual(["第一部決算特別委員会"]);
    });
  });

  describe("DB に居て desired に無い行", () => {
    it("削除せず extraKeys として報告する", () => {
      const plan = planMasterUpsert({
        table: "committees",
        desired: [{ name: "総務委員会", sort_order: 1 }],
        existing: [
          { id: "aaaa", name: "総務委員会", sort_order: 1 },
          { id: "bbbb", name: "手で足した委員会", sort_order: 50 },
        ],
        keyOf: keyOfName,
      });

      expect(plan).toEqual({
        inserts: [],
        updates: [],
        unchangedKeys: ["総務委員会"],
        extraKeys: ["手で足した委員会"],
      });
    });
  });

  describe("キーの前後の空白", () => {
    it("既存行のキーに空白が付いていても同じ行として扱い、名前を直す update にする", () => {
      const plan = planMasterUpsert({
        table: "committees",
        desired: [{ name: "総務委員会", sort_order: 1 }],
        existing: [{ id: "aaaa", name: "総務委員会 ", sort_order: 1 }],
        keyOf: keyOfName,
      });

      expect(plan.inserts).toEqual([]);
      expect(plan.extraKeys).toEqual([]);
      expect(plan.updates).toEqual([
        {
          id: "aaaa",
          key: "総務委員会",
          row: { name: "総務委員会", sort_order: 1 },
          changedColumns: ["name"],
        },
      ]);
    });
  });

  describe("不正な入力", () => {
    it("投入データのキーが重複していたら、テーブル名付きで例外", () => {
      expect(() =>
        planMasterUpsert({
          table: "committees",
          desired: [{ name: "総務委員会" }, { name: "総務委員会" }],
          existing: [],
          keyOf: keyOfName,
        }),
      ).toThrow("committees の投入データのキーが重複しています: 総務委員会");
    });

    it("既存データのキーが重複していたら、テーブル名付きで例外（unique 制約が無いテーブルの保険）", () => {
      expect(() =>
        planMasterUpsert({
          table: "committees",
          desired: [{ name: "総務委員会" }],
          existing: [
            { id: "aaaa", name: "総務委員会" },
            { id: "bbbb", name: "総務委員会" },
          ],
          keyOf: keyOfName,
        }),
      ).toThrow(
        "committees の既存データ（DB を確認してください）のキーが重複しています: 総務委員会",
      );
    });

    it("空白だけ違う行が既存データに2つあれば例外（黙って片方だけ直さない）", () => {
      expect(() =>
        planMasterUpsert({
          table: "committees",
          desired: [{ name: "総務委員会" }],
          existing: [
            { id: "aaaa", name: "総務委員会" },
            { id: "bbbb", name: "総務委員会 " },
          ],
          keyOf: keyOfName,
        }),
      ).toThrow("キーが重複しています: 総務委員会");
    });

    it("キーが空文字なら例外", () => {
      expect(() =>
        planMasterUpsert({
          table: "committees",
          desired: [{ name: "  " }],
          existing: [],
          keyOf: keyOfName,
        }),
      ).toThrow("committees の投入データのキーが空です");
    });

    it("キーが文字列でなければ例外", () => {
      expect(() =>
        planMasterUpsert({
          table: "committees",
          desired: [{ name: 123 }],
          existing: [],
          keyOf: keyOfName,
        }),
      ).toThrow("committees の投入データのキーが空です");
    });
  });
});
