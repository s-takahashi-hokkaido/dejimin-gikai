// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useTextSizeToggle } from "./use-text-size-toggle";

describe("useTextSizeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("large-text");
  });

  it("描画前のスクリプトが付けた <html> の class を読む", () => {
    document.documentElement.classList.add("large-text");
    const { result } = renderHook(() => useTextSizeToggle());
    expect(result.current.isLarge).toBe(true);
  });

  it("別のスイッチで切り替えても同じ値になる", () => {
    const first = renderHook(() => useTextSizeToggle());
    const second = renderHook(() => useTextSizeToggle());

    act(() => first.result.current.handleToggle(true));

    expect(second.result.current.isLarge).toBe(true);
  });

  it("オンにすると <html> にクラスを付けて保存する", () => {
    const { result } = renderHook(() => useTextSizeToggle());

    act(() => result.current.handleToggle(true));

    expect(result.current.isLarge).toBe(true);
    expect(document.documentElement.classList.contains("large-text")).toBe(
      true
    );
    expect(localStorage.getItem("text-size-large")).toBe("true");
  });

  it("オフにするとクラスを外して保存する", () => {
    document.documentElement.classList.add("large-text");
    localStorage.setItem("text-size-large", "true");
    const { result } = renderHook(() => useTextSizeToggle());

    act(() => result.current.handleToggle(false));

    expect(result.current.isLarge).toBe(false);
    expect(document.documentElement.classList.contains("large-text")).toBe(
      false
    );
    expect(localStorage.getItem("text-size-large")).toBe("false");
  });
});
