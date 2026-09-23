import { describe, expect, it } from "vitest";
import { diffAuditData } from "./diff-audit-data";

describe("diffAuditData", () => {
  it("更新では値が変わった列だけを返す", () => {
    const before = {
      id: "1",
      title: "旧タイトル",
      summary: "同じ要約",
      updated_at: "2026-09-01T00:00:00Z",
    };
    const after = {
      id: "1",
      title: "新タイトル",
      summary: "同じ要約",
      updated_at: "2026-09-23T00:00:00Z",
    };

    expect(diffAuditData(before, after)).toEqual([
      { field: "title", before: "旧タイトル", after: "新タイトル" },
    ]);
  });

  it("作成では値のある列を after として返す（id・日時は除く）", () => {
    const after = {
      id: "1",
      type: "for",
      comment: null,
      created_at: "2026-09-23T00:00:00Z",
      updated_at: "2026-09-23T00:00:00Z",
    };

    expect(diffAuditData(null, after)).toEqual([
      { field: "type", before: undefined, after: "for" },
      { field: "comment", before: undefined, after: null },
    ]);
  });

  it("削除では値のあった列を before として返す", () => {
    expect(diffAuditData({ id: "1", type: "against" }, null)).toEqual([
      { field: "type", before: "against", after: undefined },
    ]);
  });

  it("配列の列は中身で比べる", () => {
    const before = { discussion_overview_points: ["a", "b"] };

    expect(
      diffAuditData(before, { discussion_overview_points: ["a", "b"] })
    ).toEqual([]);
    expect(
      diffAuditData(before, { discussion_overview_points: ["a", "c"] })
    ).toEqual([
      {
        field: "discussion_overview_points",
        before: ["a", "b"],
        after: ["a", "c"],
      },
    ]);
  });

  it("null と空文字は別の値として扱う", () => {
    expect(diffAuditData({ comment: null }, { comment: "" })).toEqual([
      { field: "comment", before: null, after: "" },
    ]);
  });

  it("行が JSON オブジェクトでなければ空として扱う", () => {
    expect(diffAuditData(null, null)).toEqual([]);
    expect(diffAuditData("broken", [1, 2])).toEqual([]);
  });
});
