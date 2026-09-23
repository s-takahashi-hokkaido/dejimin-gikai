import { describe, expect, it } from "vitest";
import {
  describeAuditAction,
  formatAuditActor,
  formatAuditValue,
  formatDifficultyLevel,
  getAuditFieldLabel,
} from "./audit-log-labels";

const ROLE_LABELS = { admin: "運営者", legislator: "議員" };

describe("describeAuditAction", () => {
  it.each([
    ["bills.update", "議案マスタ", "更新"],
    ["bill_contents.insert", "議案コンテンツ", "作成"],
    ["faction_stances.delete", "会派見解", "削除"],
  ])("%s", (action, tableLabel, operationLabel) => {
    expect(describeAuditAction(action)).toEqual({ tableLabel, operationLabel });
  });

  it("未知の値はそのまま出す", () => {
    expect(describeAuditAction("tags.truncate")).toEqual({
      tableLabel: "tags",
      operationLabel: "truncate",
    });
    expect(describeAuditAction("unknown")).toEqual({
      tableLabel: "unknown",
      operationLabel: "",
    });
  });
});

describe("getAuditFieldLabel", () => {
  it("既知の列は表示名、未知の列は列名", () => {
    expect(getAuditFieldLabel("summary")).toBe("要約");
    expect(getAuditFieldLabel("new_column")).toBe("new_column");
  });
});

describe("formatAuditActor", () => {
  it("メールアドレスとロールを出す", () => {
    expect(
      formatAuditActor(
        { actor_email: "giin@example.com", actor_role: "legislator" },
        ROLE_LABELS
      )
    ).toBe("giin@example.com（議員）");
  });

  it("実行者が無ければ直接操作", () => {
    expect(
      formatAuditActor({ actor_email: null, actor_role: null }, ROLE_LABELS)
    ).toBe("直接操作（SQL・スクリプト）");
  });

  it("未知のロールはそのまま出す", () => {
    expect(
      formatAuditActor(
        { actor_email: "x@example.com", actor_role: "editor" },
        ROLE_LABELS
      )
    ).toBe("x@example.com（editor）");
  });
});

describe("formatAuditValue", () => {
  it.each([
    [undefined, "（なし）"],
    [null, "（なし）"],
    ["", "（空）"],
    ["本文", "本文"],
    [true, "はい"],
    [false, "いいえ"],
    [[], "（空）"],
    [["論点A", "論点B"], "論点A\n論点B"],
    [3, "3"],
  ] as const)("%j → %s", (value, expected) => {
    expect(formatAuditValue(value as never)).toBe(expected);
  });

  it("オブジェクトは JSON で出す", () => {
    expect(formatAuditValue({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
});

describe("formatDifficultyLevel", () => {
  it("難易度を表示名にする", () => {
    expect(formatDifficultyLevel("normal")).toBe("ふつう");
    expect(formatDifficultyLevel("hard")).toBe("難しい");
  });

  it("未知の値はそのまま、文字列でなければ空", () => {
    expect(formatDifficultyLevel("easy")).toBe("easy");
    expect(formatDifficultyLevel(undefined)).toBe("");
  });
});
