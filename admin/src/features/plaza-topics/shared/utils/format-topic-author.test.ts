import { describe, expect, it } from "vitest";
import {
  formatTopicAuthor,
  UNKNOWN_TOPIC_AUTHOR_LABEL,
} from "./format-topic-author";

describe("formatTopicAuthor", () => {
  it("議員は名前と会派を出す", () => {
    expect(
      formatTopicAuthor({
        displayName: "サンプル議員A",
        role: "legislator",
        factionName: "サンプル会派",
      })
    ).toBe("サンプル議員A（サンプル会派）");
  });

  it("出馬者は会派の代わりにロールを出す", () => {
    expect(
      formatTopicAuthor({
        displayName: "サンプル候補者C",
        role: "candidate",
        factionName: null,
      })
    ).toBe("サンプル候補者C（出馬者）");
  });

  it("ロールも会派も分からなければ名前だけ", () => {
    expect(
      formatTopicAuthor({
        displayName: "名前だけ",
        role: null,
        factionName: null,
      })
    ).toBe("名前だけ");
  });

  it("作成者が分からなければ、その旨を出す", () => {
    expect(formatTopicAuthor(null)).toBe(UNKNOWN_TOPIC_AUTHOR_LABEL);
  });
});
