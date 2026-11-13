import { describe, expect, it } from "vitest";
import {
  normalizeTopicInput,
  TOPIC_BODY_MAX_LENGTH,
  TOPIC_TITLE_MAX_LENGTH,
} from "./validate-topic-input";

describe("normalizeTopicInput", () => {
  it("タイトルと本文を受け入れる", () => {
    expect(
      normalizeTopicInput({ title: "除雪について", bodyMd: "## 見出し\n本文" })
    ).toEqual({
      ok: true,
      value: { title: "除雪について", bodyMd: "## 見出し\n本文" },
    });
  });

  describe("タイトル", () => {
    it("前後の空白を除き、改行や連続する空白を1つの空白にする", () => {
      const result = normalizeTopicInput({
        title: "  冬の\n除雪で、　 困っていること  ",
        bodyMd: "",
      });
      expect(result).toEqual({
        ok: true,
        value: { title: "冬の 除雪で、 困っていること", bodyMd: "" },
      });
    });

    it.each(["", "   ", "\n\t　"])("空なら拒否する: %j", (title) => {
      expect(normalizeTopicInput({ title, bodyMd: "本文" })).toEqual({
        ok: false,
        error: "タイトルを入力してください",
      });
    });

    it("上限ちょうどは受け入れ、超えたら拒否する", () => {
      const max = "あ".repeat(TOPIC_TITLE_MAX_LENGTH);
      expect(normalizeTopicInput({ title: max, bodyMd: "" }).ok).toBe(true);
      expect(normalizeTopicInput({ title: `${max}あ`, bodyMd: "" })).toEqual({
        ok: false,
        error: `タイトルは${TOPIC_TITLE_MAX_LENGTH}文字以内で入力してください`,
      });
    });
  });

  describe("本文", () => {
    it("下書きのうちは空でもよい", () => {
      expect(normalizeTopicInput({ title: "題", bodyMd: "" })).toEqual({
        ok: true,
        value: { title: "題", bodyMd: "" },
      });
    });

    it("空白だけなら空にする", () => {
      expect(normalizeTopicInput({ title: "題", bodyMd: " \n\n\t" })).toEqual({
        ok: true,
        value: { title: "題", bodyMd: "" },
      });
    });

    it("改行コードを LF にそろえ、Markdown の空白（行末の2スペースなど）は残す", () => {
      expect(
        normalizeTopicInput({ title: "題", bodyMd: "1行目  \r\n2行目\r3行目" })
      ).toEqual({
        ok: true,
        value: { title: "題", bodyMd: "1行目  \n2行目\n3行目" },
      });
    });

    it("上限ちょうどは受け入れ、超えたら拒否する", () => {
      const max = "a".repeat(TOPIC_BODY_MAX_LENGTH);
      expect(normalizeTopicInput({ title: "題", bodyMd: max }).ok).toBe(true);
      expect(normalizeTopicInput({ title: "題", bodyMd: `${max}a` })).toEqual({
        ok: false,
        error: `本文は${TOPIC_BODY_MAX_LENGTH}文字以内で入力してください`,
      });
    });
  });

  it.each([
    { title: undefined, bodyMd: "" },
    { title: "題", bodyMd: undefined },
    { title: 1, bodyMd: "" },
    { title: "題", bodyMd: null },
  ])("文字列でなければ拒否する: %j", (input) => {
    expect(normalizeTopicInput(input)).toEqual({
      ok: false,
      error: "入力の形式が正しくありません",
    });
  });
});
