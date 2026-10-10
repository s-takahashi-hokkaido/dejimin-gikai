// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMockBill,
  createMockBillContent,
} from "@/app/dev/_lib/mock-data";
import { BillCard } from "./bill-card";

const BILL_NAME = "札幌市敬老健康パス条例の一部を改正する条例案";

describe("BillCard", () => {
  it("タイトルと概要を出す", () => {
    render(
      <BillCard
        bill={createMockBill({
          bill_content: createMockBillContent({
            title: "敬老パスの使い道を広げる",
            summary: "地下鉄に加えてタクシーにも使えるようにします。",
          }),
        })}
      />
    );

    expect(screen.getByText("敬老パスの使い道を広げる")).toBeInTheDocument();
    expect(
      screen.getByText("地下鉄に加えてタクシーにも使えるようにします。")
    ).toBeInTheDocument();
  });

  it("議案番号があれば添える", () => {
    render(<BillCard bill={createMockBill({ bill_number: "議案第12号" })} />);

    expect(screen.getByText("議案第12号")).toBeInTheDocument();
  });

  it("注目の議案にだけ注目バッジを出す", () => {
    const { rerender } = render(
      <BillCard bill={createMockBill({ is_featured: false })} />
    );
    expect(screen.queryByText(/注目/)).not.toBeInTheDocument();

    rerender(<BillCard bill={createMockBill({ is_featured: true })} />);
    expect(screen.getByText(/注目/)).toBeInTheDocument();
  });

  it("サムネイルが未設定なら画像を出さない", () => {
    render(
      <BillCard
        bill={createMockBill({ name: BILL_NAME, thumbnail_url: null })}
      />
    );

    expect(
      screen.queryByRole("img", { name: BILL_NAME })
    ).not.toBeInTheDocument();
  });

  it("サムネイルがあれば正式名称を代替テキストにして出す", () => {
    render(
      <BillCard
        bill={createMockBill({
          name: BILL_NAME,
          thumbnail_url: "https://example.com/thumb.png",
        })}
      />
    );

    expect(screen.getByRole("img", { name: BILL_NAME })).toBeInTheDocument();
  });

  it("紐づくタグをすべて並べる", () => {
    render(
      <BillCard
        bill={createMockBill({
          tags: [
            { id: "fukushi", label: "福祉・医療" },
            { id: "kosodate", label: "子育て・教育" },
          ],
        })}
      />
    );

    expect(screen.getByText("福祉・医療")).toBeInTheDocument();
    expect(screen.getByText("子育て・教育")).toBeInTheDocument();
  });

  it("公開インタビューがあるときだけ受付中を出す", () => {
    const { rerender } = render(
      <BillCard bill={createMockBill({ hasPublicInterview: false })} />
    );
    expect(screen.queryByText("AIインタビュー受付中")).not.toBeInTheDocument();

    rerender(<BillCard bill={createMockBill({ hasPublicInterview: true })} />);
    expect(screen.getByText("AIインタビュー受付中")).toBeInTheDocument();
  });

  // タグが無くても受付中は案内する。タグの段ごと消すと受付中も消える。
  it("タグが無くても受付中を出す", () => {
    render(
      <BillCard bill={createMockBill({ tags: [], hasPublicInterview: true })} />
    );

    expect(screen.getByText("AIインタビュー受付中")).toBeInTheDocument();
  });

  it("提出日を time 要素で出す", () => {
    const { container } = render(
      <BillCard
        bill={createMockBill({ published_at: "2026-02-03T00:00:00+09:00" })}
      />
    );

    expect(container.querySelector("time")).toHaveTextContent(
      "2026/02/03 提出"
    );
  });

  it("submitted_date があれば published_at より優先して提出日に出す", () => {
    const { container } = render(
      <BillCard
        bill={createMockBill({
          submitted_date: "2026-02-12",
          published_at: "2026-03-01T00:00:00+09:00",
        })}
      />
    );

    const time = container.querySelector("time");
    expect(time).toHaveTextContent("2026/02/12 提出");
    expect(time).toHaveAttribute("dateTime", "2026-02-12");
  });

  it("提出日が無ければ日付を出さない", () => {
    const { container } = render(
      <BillCard bill={createMockBill({ published_at: null })} />
    );

    expect(container.querySelector("time")).not.toBeInTheDocument();
  });
});
