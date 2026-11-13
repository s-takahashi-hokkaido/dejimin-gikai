import { describe, expect, it } from "vitest";
import {
  formatExistingQuestionList,
  formatThemeList,
} from "./config-generation-prompt-parts";

describe("formatThemeList", () => {
  it("箇条書きにする", () => {
    expect(formatThemeList(["除雪", "通学路"])).toBe("- 除雪\n- 通学路");
  });
});

describe("formatExistingQuestionList", () => {
  it("番号を付け、フォローアップ指針と選択肢があれば添える", () => {
    expect(
      formatExistingQuestionList([
        {
          question: "困っていることは？",
          follow_up_guide: "場面を聞く",
          quick_replies: ["ある", "ない"],
        },
        { question: "ほかには？", follow_up_guide: null, quick_replies: [] },
      ])
    ).toBe(
      "1. 困っていることは？\n   フォローアップ指針: 場面を聞く\n   選択肢: ある, ない\n2. ほかには？"
    );
  });
});
