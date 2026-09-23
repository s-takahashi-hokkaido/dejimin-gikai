"use server";

import { requireRole } from "@/features/auth/server/lib/auth-server";
import { EDITOR_ROLES } from "@/features/auth/shared/utils/role";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { type BillUpdateInput, billUpdateSchema } from "../../shared/types";
import { omitAdminOnlyBillFields } from "../../shared/utils/omit-admin-only-bill-fields";
import {
  replaceBillCommittees,
  updateBillRecord,
} from "../repositories/bill-edit-repository";

export async function updateBill(id: string, input: BillUpdateInput) {
  try {
    // 議員にも開く。公開日・注目・サムネイルは運営者のみ変更できる
    const admin = await requireRole(EDITOR_ROLES);

    // バリデーション
    const { committee_ids, ...billData } = billUpdateSchema.parse(input);

    // Supabaseで更新
    await updateBillRecord(
      id,
      omitAdminOnlyBillFields(admin.role, {
        ...billData,
        published_at: billData.published_at
          ? new Date(billData.published_at).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      }),
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
