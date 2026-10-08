// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { TopicGroup } from "../../shared/utils/build-topic-groups";
import { SessionQuestionsOverview } from "./session-questions-overview";

const groups: TopicGroup[] = [
  {
    categoryLabel: "子育て・教育",
    iconName: "Baby",
    entries: [
      {
        title: "保育所の待機児童対策",
        questionSummary: "待機児童は？",
        answerSummary: "令和9年度中に解消予定。",
        answererRole: "子ども未来局長",
        answererName: "田中一郎",
        topicCount: 1,
        topicIndex: 0,
        questioner: { id: "q1", name: "山田花子", party: "テスト会派" },
      },
    ],
  },
  {
    categoryLabel: "防災・安全",
    iconName: "Shield",
    entries: [
      {
        title: "冬の災害への備え",
        questionSummary: "停電への備えは？",
        answerSummary: "避難所の暖房を増やす。",
        answererRole: "危機管理局長",
        answererName: "佐藤次郎",
        topicCount: 2,
        topicIndex: 3,
        questioner: { id: "q2", name: "佐藤太郎", party: null },
      },
    ],
  },
];

const EMPTY_OVERVIEW = { lines: null, themeLines: {} };

/** 畳んだパネルも DOM に残すので、hidden の内側にあるかで開閉を見る */
function isVisibleText(text: string) {
  return screen.getByText(text).closest("[hidden]") === null;
}

describe("SessionQuestionsOverview", () => {
  it("3行まとめを表示する", () => {
    render(
      <SessionQuestionsOverview
        groups={groups}
        overview={{
          lines: ["1行目の話題", "2行目の話題", "3行目の話題"],
          themeLines: {},
        }}
      />
    );
    expect(
      screen.getByRole("heading", {
        name: "どんな話があった？（今回の3行まとめ）",
      })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("1行目の話題")).toBeInTheDocument();
  });

  it("3行まとめが無ければブロックごと出さない", () => {
    render(
      <SessionQuestionsOverview groups={groups} overview={EMPTY_OVERVIEW} />
    );
    expect(
      screen.queryByText("どんな話があった？（今回の3行まとめ）")
    ).not.toBeInTheDocument();
  });

  it("テーマを件数つきで並べ、最初はすべて畳んでおく", () => {
    render(
      <SessionQuestionsOverview groups={groups} overview={EMPTY_OVERVIEW} />
    );
    const button = screen.getByRole("button", { name: /子育て・教育/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    // 防災・安全は topicCount=2 → 「2件」
    expect(
      screen.getByRole("button", { name: /防災・安全\s*2件/ })
    ).toBeInTheDocument();
    // 畳んでいる間もカードは DOM にあるが、hidden で隠れている
    expect(isVisibleText("令和9年度中に解消予定。")).toBe(false);
  });

  it("畳んでいる間はテーマの3行を見せ、開くとカードに切り替える", async () => {
    const user = userEvent.setup();
    render(
      <SessionQuestionsOverview
        groups={groups}
        overview={{
          lines: null,
          themeLines: { "子育て・教育": ["保育の話", "教育の話", "給食の話"] },
        }}
      />
    );
    expect(screen.getByText("保育の話")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /子育て・教育/ }));

    expect(screen.queryByText("保育の話")).not.toBeInTheDocument();
    expect(isVisibleText("令和9年度中に解消予定。")).toBe(true);
    // もう一方のテーマは畳んだまま
    expect(isVisibleText("避難所の暖房を増やす。")).toBe(false);
  });

  it("開閉ボタンがパネルを aria-controls で指す", () => {
    render(
      <SessionQuestionsOverview groups={groups} overview={EMPTY_OVERVIEW} />
    );
    const button = screen.getByRole("button", { name: /子育て・教育/ });
    const panelId = button.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).toHaveTextContent(
      "令和9年度中に解消予定。"
    );
  });

  it("「すべて開く」で全テーマを開き、「すべて閉じる」に変わる", async () => {
    const user = userEvent.setup();
    render(
      <SessionQuestionsOverview groups={groups} overview={EMPTY_OVERVIEW} />
    );
    await user.click(screen.getByRole("button", { name: "すべて開く" }));

    expect(isVisibleText("令和9年度中に解消予定。")).toBe(true);
    expect(isVisibleText("避難所の暖房を増やす。")).toBe(true);
    expect(
      screen.getByRole("button", { name: "すべて閉じる" })
    ).toBeInTheDocument();
  });

  it("「質疑の詳細」リンクが topicIndex のアンカー付きURLになる", async () => {
    const user = userEvent.setup();
    render(
      <SessionQuestionsOverview groups={groups} overview={EMPTY_OVERVIEW} />
    );
    await user.click(screen.getByRole("button", { name: "すべて開く" }));
    const hrefs = screen
      .getAllByRole("link", { name: /質疑の詳細/ })
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/questions/q1#topic-0");
    expect(hrefs).toContain("/questions/q2#topic-3");
  });
});
