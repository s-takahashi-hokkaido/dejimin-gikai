/**
 * 日時を日本時間で「2026/11/13 09:00」の形にする。無ければ "-"
 *
 * タイムゾーンを固定するのは、サーバー（UTC）での描画とブラウザでの描画で表示がずれないようにするため。
 */
export function formatJstDateTime(dateString: string | null): string {
  if (!dateString) {
    return "-";
  }
  return new Date(dateString).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
