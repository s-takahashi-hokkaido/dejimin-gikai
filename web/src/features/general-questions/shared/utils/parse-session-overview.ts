import type { SessionQuestionOverview } from "../types";

/**
 * general_question_overviews の行を画面で使う形に整える。
 *
 * - lines は空なら null（3行まとめのブロックごと出さない）
 * - theme_lines は jsonb なので形を信用せず、文字列の配列だけを拾う
 */
export function parseSessionOverview(
  row: { lines: unknown; theme_lines: unknown } | null
): SessionQuestionOverview {
  const lines = toStringArray(row?.lines);
  return {
    lines: lines.length > 0 ? lines : null,
    themeLines: parseThemeLines(row?.theme_lines),
  };
}

function parseThemeLines(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const lines = toStringArray(value);
    if (lines.length > 0) out[key] = lines;
  }
  return out;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === "string" && v.trim() !== ""
  );
}
