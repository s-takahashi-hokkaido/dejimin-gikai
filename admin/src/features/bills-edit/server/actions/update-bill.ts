"use server";

import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { type BillUpdateInput, billUpdateSchema } from "../../shared/types";
import {
  replaceBillCommittees,
  updateBillRecord,
} from "../repositories/bill-edit-repository";

export async function updateBill(id: string, input: BillUpdateInput) {
  try {
    // 管理者権限チェック
    const admin = await requireAdmin();

    // バリデーション
    const { committee_ids, ...billData } = billUpdateSchema.parse(input);

    // Supabaseで更新
    await updateBillRecord(
      id,
      {
        ...billData,
        published_at: billData.published_at
          ? new Date(billData.published_at).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      },
      admin
    );
    try {
      await replaceBillCommittees(id, committee_ids, admin);
    } finally {
      // 付託委員会の保存に失敗しても基本情報は更新済みなので、web側のキャッシュは無効化する
      await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);
    }
  } catch (error) {
    console.error("Update bill error:", error);
    throw new Error(
      getErrorMessage(error, "議案の更新中にエラーが発生しました")
    );
  }
}
