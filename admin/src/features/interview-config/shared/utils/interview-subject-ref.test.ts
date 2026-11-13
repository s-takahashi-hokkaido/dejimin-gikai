import { describe, expect, it } from "vitest";
import { parseInterviewSubjectRef } from "./interview-subject-ref";

const ID = "11111111-1111-1111-1111-111111111111";

describe("parseInterviewSubjectRef", () => {
  it.each(["bill", "topic"] as const)("%s の参照を読む", (kind) => {
    expect(parseInterviewSubjectRef({ kind, id: ID })).toEqual({
      kind,
      id: ID,
    });
  });

  it("余計なプロパティは捨てる", () => {
    expect(
      parseInterviewSubjectRef({ kind: "bill", id: ID, extra: 1 })
    ).toEqual({ kind: "bill", id: ID });
  });

  it.each([
    null,
    undefined,
    "bill",
    { kind: "session", id: ID },
    { kind: "bill" },
    { kind: "topic", id: "not-a-uuid" },
    { kind: "topic", id: `${ID},status.eq.open` },
  ])("形が違えば null: %j", (value) => {
    expect(parseInterviewSubjectRef(value)).toBeNull();
  });
});
