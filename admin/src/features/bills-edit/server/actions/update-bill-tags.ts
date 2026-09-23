"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/features/auth/server/lib/auth-server";
import { EDITOR_ROLES } from "@/features/auth/shared/utils/role";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { calculateSetDiff } from "@/lib/utils/calculate-set-diff";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  createBillsTags,
  deleteBillsTags,
  findBillsTagsByBillId,
} from "../repositories/bill-edit-repository";

/**
 * 議案のタグを更新する
 * 既存のタグと新しいタグを比較して、差分のみを更新する
 */
export async function updateBillTags(billId: string, tagIds: string[]) {
  // 議員にも開く（タグ付けは監査ログの対象外）
  await requireRole(EDITOR_ROLES);

  try {
    const existingTagIds = await findBillsTagsByBillId(billId);
    const { toAdd, toDelete } = calculateSetDiff(existingTagIds, tagIds);

    // 削除処理
    if (toDelete.length > 0) {
      await deleteBillsTags(billId, toDelete);
    }

    // 追加処理
    if (toAdd.length > 0) {
      await createBillsTags(billId, toAdd);
    }

    revalidatePath("/bills", "layout");
    // キャッシュを更新
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `タグの更新中にエラーが発生しました: ${getErrorMessage(error, "不明なエラー")}`,
    };
  }
}
