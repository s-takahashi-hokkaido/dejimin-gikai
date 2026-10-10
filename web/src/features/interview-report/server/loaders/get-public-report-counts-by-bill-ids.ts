import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { countPublicReportsByBillIds } from "../repositories/interview-report-repository";

/**
 * 議案ごとの公開レポート件数（AIインタビューの回答数）。0件の議案は含まない。
 *
 * 回答数はバッジと並び替えにしか使わないので、取れなくても一覧は出す。
 * 失敗はキャッシュ関数の外で受ける。中で空に変換すると、一時的なDBエラーが
 * 「全議案0件」としてキャッシュに載ってしまう。
 */
export async function getPublicReportCountsByBillIds(
  billIds: string[]
): Promise<Map<string, number>> {
  try {
    return new Map(await _getCachedReportCounts(billIds));
  } catch (error) {
    console.error("Failed to count public reports by bill ids:", error);
    return new Map();
  }
}

/**
 * 回答数のキャッシュ。
 *
 * /bills は searchParams と cookie を読むため毎リクエスト動的に描画される。
 * 素で集計すると、全公開レポートを走る集計クエリが絞り込みのクリックごとに走る。
 *
 * 一方で議案本体の 600 秒キャッシュに載せると数字が古く見えるので、短い TTL を
 * 別に持たせる。回答数は「💬 N人が回答」の粗いバッジと並び替えのキーにしか
 * 使わないので、1分の遅れは体感に出ない。管理画面でレポートの公開状態を
 * 変えたときは public-interview-reports タグで即時に無効化される。
 */
const _getCachedReportCounts = unstable_cache(
  async (billIds: string[]) => {
    const counts = await countPublicReportsByBillIds(billIds);
    // unstable_cache は Map を返せないので配列で保存する。
    return [...counts.entries()];
  },
  ["bills-public-report-counts"],
  { revalidate: 60, tags: [CACHE_TAGS.PUBLIC_INTERVIEW_REPORTS] }
);
