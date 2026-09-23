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
  let redirectTo = "/bills";

  try {
    // 管理者権限チェック
    const admin = await requireAdmin();

    // バリデーション
    const { committee_ids, ...billData } = billCreateSchema.parse(input);

    const insertData = {
      ...billData,
      published_at: billData.published_at
        ? new Date(billData.published_at).toISOString()
        : null,
    };

    // Supabaseに挿入
    const bill = await createBillRecord(insertData, admin);
    try {
      await replaceBillCommittees(bill.id, committee_ids, admin);
    } catch (error) {
      // 議案は作成済み。エラーにすると作成し直して重複しかねないので、
      // 編集画面に移って付託委員会を設定し直してもらう
      console.error("Create bill committees error:", error);
      redirectTo = `/bills/${bill.id}/edit`;
    }

    // web側のキャッシュを無効化
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
  } catch (error) {
    console.error("Create bill error:", error);
    throw new Error(
      getErrorMessage(error, "議案の作成中にエラーが発生しました")
    );
  }

  // 成功したら一覧ページへ（付託委員会だけ保存できなかった場合は編集画面へ）リダイレクト
  redirect(redirectTo);
}
