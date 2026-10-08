/**
 * 複数カラムの部分一致（ilike）を PostgREST の or() フィルタ文字列にする。
 *
 * 検索語をそのまま埋め込むと、`,` `(` `)` などを含む語で
 * フィルタ条件そのものを書き換えられてしまう（例: "a,id.neq.0"）。
 * 値を二重引用符で囲み、引用符とバックスラッシュをエスケープして
 * PostgREST に 1 つの値として解釈させる。
 * あわせて LIKE のワイルドカード（% _）もエスケープし、文字どおりに検索する。
 */
export function buildIlikeOrFilter(columns: string[], query: string): string {
  const pattern = `%${escapeLikePattern(query)}%`;
  const quoted = `"${escapePostgrestQuotedValue(pattern)}"`;
  return columns.map((column) => `${column}.ilike.${quoted}`).join(",");
}

/** LIKE パターンの特殊文字（\ % _）をバックスラッシュでエスケープする */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** PostgREST の引用符付きの値の中で特別な意味を持つ \ と " をエスケープする */
function escapePostgrestQuotedValue(value: string): string {
  return value.replace(/[\\"]/g, (char) => `\\${char}`);
}
