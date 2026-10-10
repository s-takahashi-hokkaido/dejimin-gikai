import { describe, expect, it } from "vitest";
import { parseSessionOverview } from "./parse-session-overview";

describe("parseSessionOverview", () => {
  it("行が無ければ lines は null、themeLines は空", () => {
    expect(parseSessionOverview(null)).toEqual({
      lines: null,
      themeLines: {},
    });
  });

  it("全体の3行とテーマ別の3行を取り出す", () => {
    expect(
      parseSessionOverview({
        lines: ["一行目", "二行目", "三行目"],
        theme_lines: { "子育て・教育": ["a", "b", "c"] },
      })
    ).toEqual({
      lines: ["一行目", "二行目", "三行目"],
      themeLines: { "子育て・教育": ["a", "b", "c"] },
    });
  });

  it("全体の行が空配列なら null にする", () => {
    expect(parseSessionOverview({ lines: [], theme_lines: {} }).lines).toBe(
      null
    );
  });

  it("文字列でない値や空文字は捨てる", () => {
    expect(
      parseSessionOverview({
        lines: ["一行目", 1, "", "  ", null],
        theme_lines: {
          "子育て・教育": ["a", 2, ""],
          "防災・安全": "配列ではない",
          "健康・医療": [],
        },
      })
    ).toEqual({
      lines: ["一行目"],
      themeLines: { "子育て・教育": ["a"] },
    });
  });

  it("theme_lines が配列やオブジェクト以外なら空にする", () => {
    expect(
      parseSessionOverview({ lines: ["一行目"], theme_lines: ["a"] }).themeLines
    ).toEqual({});
    expect(
      parseSessionOverview({ lines: ["一行目"], theme_lines: "a" }).themeLines
    ).toEqual({});
  });
});
