import { describe, expect, it } from "vitest";
import {
  extractPromptVariables,
  findRemovedVariables,
} from "./prompt-variables";

describe("extractPromptVariables", () => {
  it("出てきた順に重複なしで返す", () => {
    expect(
      extractPromptVariables("{{billName}} {{billTitle}} {{billName}}")
    ).toEqual(["billName", "billTitle"]);
  });

  it("括弧の内側の空白を許容する", () => {
    expect(extractPromptVariables("{{ billName }}")).toEqual(["billName"]);
  });

  it("変数が無ければ空配列を返す", () => {
    expect(extractPromptVariables("固定の本文 {単独の括弧}")).toEqual([]);
  });
});

describe("findRemovedVariables", () => {
  it("編集後の本文から消えた変数を返す", () => {
    expect(
      findRemovedVariables("{{billName}} {{billContent}}", "{{billName}}")
    ).toEqual(["billContent"]);
  });

  it("変数が増えただけなら空配列を返す", () => {
    expect(findRemovedVariables("{{a}}", "{{a}} {{b}}")).toEqual([]);
  });
});
