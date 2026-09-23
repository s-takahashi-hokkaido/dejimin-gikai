"use server";

import { revalidatePath } from "next/cache";
import type { AuditActor } from "@/features/audit-logs/shared/utils/audit-actor";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import type { BillPublishStatus } from "../../shared/types";
import { updateBillPublishStatus } from "../repositories/bill-repository";

interface UpdatePublishStatusResult {
  success: boolean;
  error?: string;
}

// フォームアクション用のラッパー関数
export async function updatePublishStatusAction(formData: FormData) {
  const admin = await requireAdmin();

  const billId = formData.get("billId") as string;
  const newStatus = formData.get("newStatus") as BillPublishStatus;

  if (!billId || !newStatus) {
    throw new Error("必要なパラメータが不足しています");
  }

  const result = await _updateBillPublishStatus(billId, newStatus, admin);

  if (!result.success) {
    throw new Error(result.error || "ステータスの更新に失敗しました");
  }

  revalidatePath("/bills");
}

async function _updateBillPublishStatus(
  billId: string,
  publishStatus: BillPublishStatus,
  actor: AuditActor
): Promise<UpdatePublishStatusResult> {
  try {
    await updateBillPublishStatus(billId, publishStatus, actor);

    // web側のキャッシュを無効化
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);

    return { success: true };
  } catch (error) {
    console.error("Error updating publish status:", error);
    return {
      success: false,
      error: "ステータスの更新に失敗しました",
    };
  }
}
