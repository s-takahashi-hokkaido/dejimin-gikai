/**
 * 議案の作成・更新におけるDBエラーを日本語メッセージに変換する純粋関数。
 */

type DbError = {
  code: string;
  message: string;
};

type BillOperation = "作成" | "更新";

export function mapBillDbError(
  error: DbError,
  operation: BillOperation
): string {
  if (error.code === "23505") {
    return "同じ定例会に、同じ議案番号・議案種別の議案が既に存在します";
  }
  return `議案の${operation}に失敗しました: ${error.message}`;
}
