/**
 * `<input type="date">` の値を date カラムに渡せる形へ正規化する
 *
 * 未入力のとき空文字が送られてくるが、空文字は date 型に挿入できないため null に変換する。
 * 入力済みの場合は "YYYY-MM-DD" をそのまま返す（タイムゾーン変換を挟むと日付がずれるため）。
 */
export function normalizeDateInput(
  value: string | null | undefined
): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
