import { describe, expect, it } from "vitest";
import { compilePrompt } from "./compile-prompt";

describe("compilePrompt", () => {
  it("{{変数名}} を値で置き換える", () => {
    expect(compilePrompt("議案: {{billName}}", { billName: "第1号" })).toBe(
      "議案: 第1号"
    );
  });

  it("同じ変数が複数回あれば全て置き換える", () => {
    expect(compilePrompt("{{a}} と {{a}}", { a: "x" })).toBe("x と x");
  });

  it("括弧の内側の空白を許容する", () => {
    expect(compilePrompt("{{ billName }}", { billName: "第1号" })).toBe(
      "第1号"
    );
  });

  it("値が渡されなかった変数は空文字にする", () => {
    expect(compilePrompt("[{{missing}}]", {})).toBe("[]");
    expect(compilePrompt("[{{missing}}]")).toBe("[]");
  });

  it("値の中の {{...}} は置き換えない", () => {
    expect(compilePrompt("{{a}} {{b}}", { a: "{{b}}", b: "B" })).toBe(
      "{{b}} B"
    );
  });

  it("変数が無い本文はそのまま返す", () => {
    expect(compilePrompt("固定の本文", { a: "x" })).toBe("固定の本文");
  });
});
