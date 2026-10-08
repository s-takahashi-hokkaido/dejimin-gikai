// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ReviewCompleteBadge, ReviewInProgressBanner } from "./review-status";

// Radix の Tooltip は位置合わせに ResizeObserver を使うが、jsdom には無い
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

describe("ReviewInProgressBanner", () => {
  it("確認中であることを伝える", () => {
    render(<ReviewInProgressBanner />);
    expect(
      screen.getByText(
        "この解説は内容を確認しているところです。今後内容が変わることがあります。"
      )
    ).toBeInTheDocument();
  });
});

describe("ReviewCompleteBadge", () => {
  it("説明なしの印は画像として読み上げる", () => {
    render(<ReviewCompleteBadge />);
    expect(
      screen.getByRole("img", { name: "解説は確認済み" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("説明付きの印はタップで説明を開く", async () => {
    render(<ReviewCompleteBadge showTooltip />);
    const trigger = screen.getByRole("button", {
      name: "この解説は、議案の原文と照らし合わせた内容の確認が済んでいます",
    });

    fireEvent.click(trigger);

    expect(
      await screen.findByRole("tooltip", {
        name: "この解説は、議案の原文と照らし合わせた内容の確認が済んでいます",
      })
    ).toBeInTheDocument();
  });
});
