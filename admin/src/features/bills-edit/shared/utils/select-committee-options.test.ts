import { describe, expect, it } from "vitest";
import type { Committee } from "@/features/committees/shared/types";
import { selectCommitteeOptions } from "./select-committee-options";

function committee(id: string, isActive: boolean): Committee {
  return {
    id,
    name: `委員会${id}`,
    committee_type: "standing",
    description: null,
    sort_order: 0,
    is_active: isActive,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("selectCommitteeOptions", () => {
  const committees = [
    committee("a", true),
    committee("b", false),
    committee("c", true),
  ];

  it("有効な委員会だけを返す", () => {
    expect(selectCommitteeOptions(committees, []).map((c) => c.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("無効な委員会でも付託済みなら残す", () => {
    expect(selectCommitteeOptions(committees, ["b"]).map((c) => c.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("並び順は元の配列のまま", () => {
    expect(
      selectCommitteeOptions(committees, ["b", "a"]).map((c) => c.id)
    ).toEqual(["a", "b", "c"]);
  });
});
