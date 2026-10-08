"use client";

import { useSyncExternalStore } from "react";
import { LARGE_TEXT_CLASS, setTextSizeLargeToStorage } from "./storage";

const CHANGE_EVENT = "text-size-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

// 設定の実体は <html> の class（描画前のスクリプトで保存値から付けている）。
// PC メニューとハンバーガーメニューのスイッチが同じ値を見るよう、ここから読む
function getSnapshot() {
  return document.documentElement.classList.contains(LARGE_TEXT_CLASS);
}

function getServerSnapshot() {
  return false;
}

export function useTextSizeToggle() {
  const isLarge = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const handleToggle = (checked: boolean) => {
    setTextSizeLargeToStorage(checked);
    document.documentElement.classList.toggle(LARGE_TEXT_CLASS, checked);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { isLarge, handleToggle };
}
