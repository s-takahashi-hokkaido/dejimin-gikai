// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PressConference, PressConferenceItem } from "../../shared/types";
import { PressConferenceDetail } from "./press-conference-detail";

function makeItem(
  overrides: Partial<PressConferenceItem> & Pick<PressConferenceItem, "id">
): PressConferenceItem {
  return {
    itemType: "announcement",
    orderIndex: 0,
    title: "発表項目",
    summary: null,
    materialUrl: null,
    turns: [],
    ...overrides,
  };
}

function makePressConference(items: PressConferenceItem[]): PressConference {
  return {
    id: "pc-1",
    slug: "2026-10-07",
    title: "市長定例記者会見",
    // 日本時間 8 時（UTC では前日）
    heldAt: "2026-10-07T08:00:00+09:00",
    youtubeUrl: null,
    status: "published",
    items,
  };
}

describe("PressConferenceDetail", () => {
  it("開催日を日本時間の曜日付きで出す", () => {
    render(<PressConferenceDetail pressConference={makePressConference([])} />);
    expect(screen.getByText(/2026年10月7日\(水\)/)).toBeInTheDocument();
  });

  it("発表と質疑応答の件数を見出しに出す", () => {
    render(
      <PressConferenceDetail
        pressConference={makePressConference([
          makeItem({ id: "a1", title: "冬のイベント" }),
          makeItem({ id: "q1", itemType: "qa", title: "除雪について" }),
        ])}
      />
    );
    expect(
      screen.getByRole("heading", { name: "市からの発表" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "記者との質疑応答" })
    ).toBeInTheDocument();
  });

  it("発表案件がない回は「市からの発表」の見出しを出さない", () => {
    render(
      <PressConferenceDetail
        pressConference={makePressConference([
          makeItem({ id: "q1", itemType: "qa", title: "除雪について" }),
        ])}
      />
    );
    expect(
      screen.queryByRole("heading", { name: "市からの発表" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "記者との質疑応答" })
    ).toBeInTheDocument();
  });

  it("質疑応答がない回は「記者との質疑応答」の見出しを出さない", () => {
    render(
      <PressConferenceDetail
        pressConference={makePressConference([
          makeItem({ id: "a1", title: "冬のイベント" }),
        ])}
      />
    );
    expect(
      screen.queryByRole("heading", { name: "記者との質疑応答" })
    ).not.toBeInTheDocument();
  });

  it("配付資料がある発表項目に PDF へのリンクを出す", () => {
    render(
      <PressConferenceDetail
        pressConference={makePressConference([
          makeItem({
            id: "a1",
            title: "冬のイベント",
            materialUrl: "https://www.city.sapporo.jp/example.pdf",
          }),
          makeItem({ id: "a2", title: "資料なしの発表" }),
        ])}
      />
    );
    const links = screen.getAllByRole("link", { name: /配付資料（PDF）/ });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      "href",
      "https://www.city.sapporo.jp/example.pdf"
    );
    expect(links[0]).toHaveAttribute("target", "_blank");
  });
});
