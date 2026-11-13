import { describe, expect, it } from "vitest";
import { buildTopicDateRows } from "./build-topic-date-rows";

const BASE = {
  createdAt: "2026-11-01T00:00:00+00:00",
  updatedAt: "2026-11-02T00:00:00+00:00",
  openedAt: null,
  closesAt: null,
  closedAt: null,
};

const labels = (rows: { label: string }[]) => rows.map((row) => row.label);

describe("buildTopicDateRows", () => {
  it("下書きは作成日時と更新日時だけ", () => {
    expect(buildTopicDateRows(BASE)).toEqual([
      {
        label: "作成日時",
        dateTime: "2026-11-01T00:00:00+00:00",
        value: "2026/11/01 09:00",
      },
      {
        label: "更新日時",
        dateTime: "2026-11-02T00:00:00+00:00",
        value: "2026/11/02 09:00",
      },
    ]);
  });

  it("オープン中は、オープン日時と自動クローズの期限を出す", () => {
    const rows = buildTopicDateRows({
      ...BASE,
      openedAt: "2026-11-03T00:00:00+00:00",
      closesAt: "2026-12-03T00:00:00+00:00",
    });
    expect(labels(rows)).toEqual([
      "作成日時",
      "更新日時",
      "オープン日時",
      "自動クローズの期限",
    ]);
  });

  it("クローズ済みは、期限の代わりにクローズ日時を出す", () => {
    const rows = buildTopicDateRows({
      ...BASE,
      openedAt: "2026-11-03T00:00:00+00:00",
      closesAt: "2026-12-03T00:00:00+00:00",
      closedAt: "2026-11-20T00:00:00+00:00",
    });
    expect(labels(rows)).toEqual([
      "作成日時",
      "更新日時",
      "オープン日時",
      "クローズ日時",
    ]);
  });
});
