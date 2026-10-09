/**
 * アカウント一覧の日時（招待の送信日時・最終ログイン）を日本時間で表示する。無ければ "-"
 *
 * タイムゾーンを固定するのは、サーバー（UTC）での描画とブラウザでの描画で表示がずれないようにするため。
 */
export function formatAccountDateTime(dateString: string | null): string {
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
