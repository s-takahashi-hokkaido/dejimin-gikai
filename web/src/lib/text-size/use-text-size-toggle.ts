"use client";

import { useEffect, useState } from "react";
import {
  getTextSizeLargeFromStorage,
  LARGE_TEXT_CLASS,
  setTextSizeLargeToStorage,
} from "./storage";

export function useTextSizeToggle() {
  const [isLarge, setIsLarge] = useState(false);

  useEffect(() => {
    setIsLarge(getTextSizeLargeFromStorage());
  }, []);

  const handleToggle = (checked: boolean) => {
    setIsLarge(checked);
    setTextSizeLargeToStorage(checked);
    document.documentElement.classList.toggle(LARGE_TEXT_CLASS, checked);
  };

  return { isLarge, handleToggle };
}
