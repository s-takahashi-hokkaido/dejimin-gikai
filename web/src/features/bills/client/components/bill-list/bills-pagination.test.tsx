// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BillsPagination } from "./bills-pagination";

const hrefForPage = (page: number) => `/bills?page=${page}`;

describe("BillsPagination", () => {
  it("1ページしか無ければ何も出さない", () => {
    const { container } = render(
      <BillsPagination page={1} totalPages={1} hrefForPage={hrefForPage} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("現在のページはリンクにせず、現在地として示す", () => {
    render(
      <BillsPagination page={2} totalPages={3} hrefForPage={hrefForPage} />
    );

    const current = screen.getByText("2");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.closest("a")).toBeNull();
  });

  it("他のページへはリンクで送る", () => {
    render(
      <BillsPagination page={2} totalPages={3} hrefForPage={hrefForPage} />
    );

    expect(screen.getByRole("link", { name: "1ページ目" })).toHaveAttribute(
      "href",
      "/bills?page=1"
    );
    expect(screen.getByRole("link", { name: "3ページ目" })).toHaveAttribute(
      "href",
      "/bills?page=3"
    );
  });

  it("前後のページへの矢印を出す", () => {
    render(
      <BillsPagination page={2} totalPages={3} hrefForPage={hrefForPage} />
    );

    expect(screen.getByRole("link", { name: "前のページ" })).toHaveAttribute(
      "href",
      "/bills?page=1"
    );
    expect(screen.getByRole("link", { name: "次のページ" })).toHaveAttribute(
      "href",
      "/bills?page=3"
    );
  });

  // 端でも矢印の場所は残す。消すと番号の並びが左右にずれる。
  it("端では送れない向きの矢印をリンクにしない", () => {
    const { rerender } = render(
      <BillsPagination page={1} totalPages={3} hrefForPage={hrefForPage} />
    );
    expect(
      screen.queryByRole("link", { name: "前のページ" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "次のページ" })
    ).toBeInTheDocument();

    rerender(
      <BillsPagination page={3} totalPages={3} hrefForPage={hrefForPage} />
    );
    expect(
      screen.getByRole("link", { name: "前のページ" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "次のページ" })
    ).not.toBeInTheDocument();
  });

  it("ページが多いときは間を省略する", () => {
    render(
      <BillsPagination page={5} totalPages={10} hrefForPage={hrefForPage} />
    );

    expect(screen.getAllByText("…")).toHaveLength(2);
    expect(
      screen.queryByRole("link", { name: "2ページ目" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "10ページ目" })
    ).toBeInTheDocument();
  });
});
