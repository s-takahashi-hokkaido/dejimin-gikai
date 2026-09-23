"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { type BillCreateInput, billCreateSchema } from "../../shared/types";
import {
  createBillRecord,
  replaceBillCommittees,
} from "../repositories/bill-edit-repository";

export async function createBill(input: BillCreateInput) {
  try {
    // 管理者権限チェック
    await requireAdmin();

    // バリデーション
    const { committee_ids, ...billData } = billCreateSchema.parse(input);

    const insertData = {
      ...billData,
      published_at: billData.published_at
        ? new Date(billData.published_at).toISOString()
        : null,
    };

    // Supabaseに挿入
    const bill = await createBillRecord(insertData);
    try {
      await replaceBillCommittees(bill.id, committee_ids);
    } catch (error) {
      // 議案は作成済みなので、作り直すと重複する。編集画面での再設定を促す
      throw new Error(
        `議案は作成しましたが、付託委員会を保存できませんでした。議案一覧から編集して設定し直してください（${getErrorMessage(error, "不明なエラー")}）`
      );
    }

    // web側のキャッシュを無効化
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
  } catch (error) {
    console.error("Create bill error:", error);
    throw new Error(
      getErrorMessage(error, "議案の作成中にエラーが発生しました")
    );
  }

  // 成功したら一覧ページへリダイレクト
  redirect("/bills");
}
