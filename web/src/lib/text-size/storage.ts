export const TEXT_SIZE_STORAGE_KEY = "text-size-large";
export const LARGE_TEXT_CLASS = "large-text";

export function getTextSizeLargeFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(TEXT_SIZE_STORAGE_KEY) === "true";
  } catch {
    // プライベートブラウズ等で localStorage が使えない場合は既定のサイズ
    return false;
  }
}

export function setTextSizeLargeToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TEXT_SIZE_STORAGE_KEY, enabled.toString());
  } catch {
    // 保存できなくても、今開いているページには反映されるので無視する
  }
}
