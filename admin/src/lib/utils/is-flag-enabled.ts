/**
 * 環境変数のフラグが明示的に有効化されているかを判定する。
 * 安全側に倒すため、"true" または "1"（前後の空白・大文字小文字は無視）のときだけ true を返す。
 * 未設定・空文字・それ以外の値はすべて false。
 */
export function isFlagEnabled(value: string | undefined): boolean {
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1";
}
