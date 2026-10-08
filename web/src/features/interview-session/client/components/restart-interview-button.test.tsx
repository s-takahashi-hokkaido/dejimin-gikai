// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockArchive, mockPush } = vi.hoisted(() => ({
  mockArchive: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock("../../server/actions/archive-interview-session", () => ({
  archiveInterviewSession: mockArchive,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { RestartInterviewButton } from "./restart-interview-button";

describe("RestartInterviewButton", () => {
  beforeEach(() => {
    mockArchive.mockReset();
    mockPush.mockReset();
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  function openDialog() {
    render(<RestartInterviewButton sessionId="session-1" billId="bill-1" />);
    fireEvent.click(
      screen.getByRole("button", { name: "もう一度最初から回答する" })
    );
  }

  it("押すと window.confirm ではなく確認ダイアログを開く", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    openDialog();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "最初からやり直しますか？" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("現在の回答内容は破棄されます。")
    ).toBeInTheDocument();
  });

  it("キャンセルするとアーカイブせずにダイアログを閉じる", async () => {
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(mockArchive).not.toHaveBeenCalled();
  });

  it("やり直すとセッションをアーカイブしてチャットへ遷移する", async () => {
    mockArchive.mockResolvedValue({ success: true });
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "最初からやり直す" }));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/bills/bill-1/interview/chat")
    );
    expect(mockArchive).toHaveBeenCalledWith("session-1");
  });

  it("アーカイブに失敗したらダイアログを閉じて遷移しない", async () => {
    mockArchive.mockResolvedValue({ success: false, error: "失敗" });
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "最初からやり直す" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(window.alert).toHaveBeenCalledWith("失敗");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
