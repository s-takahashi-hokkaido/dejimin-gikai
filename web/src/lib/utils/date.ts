// 公開側の日付表示はサーバー・ブラウザのタイムゾーンに関係なく日本時間で出す。
// UTC のサーバーで getMonth() や toLocaleDateString() を使うと、
// 日本時間 0〜9 時の日時が前日として表示されてしまう。
const JST = "Asia/Tokyo";

const jstLongDateFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: JST,
});

const jstLongDateWithWeekdayFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: JST,
});

const jstNumericDateFormat = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: JST,
});

function parseDate(dateString: string): Date | null {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 日付を日本語の長い形式でフォーマット (例: 2025年10月1日)
 * 不正な値のときは空文字を返す
 */
export function formatDate(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) return "";
  return jstLongDateFormat.format(date);
}

/**
 * 日付を曜日付きの長い形式でフォーマット (例: 2025年10月1日(水))
 * 不正な値のときは空文字を返す
 */
export function formatDateWithWeekday(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) return "";
  return jstLongDateWithWeekdayFormat.format(date);
}

/**
 * 日付をドット区切り形式でフォーマット (例: 2025.10.1)
 * ゼロ埋めなし。不正な値のときは空文字を返す
 * @deprecated formatDateJST を使用してください
 */
export function formatDateWithDots(dateString: string): string {
  const parts = getJstDateParts(dateString);
  if (!parts) return "";
  return `${parts.year}.${parts.month}.${parts.day}`;
}

/**
 * 日本時間での年・月・日を数値で返す。不正な値のときは null
 */
export function getJstDateParts(
  dateString: string
): { year: number; month: number; day: number } | null {
  const date = parseDate(dateString);
  if (!date) return null;
  const parts = jstNumericDateFormat.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * 日付を日本時間でスラッシュ区切り形式でフォーマット (例: 2026/02/12)
 * タイムゾーンを Asia/Tokyo に固定してゼロ埋めあり
 */
export function formatDateJST(dateString: string): string {
  const date = new Date(dateString);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}/${month}/${day}`;
}

/**
 * 日本時間の現在時刻を返す
 */
export function getJapanTime(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
}
