"use server";

import { requireRole } from "@/features/auth/server/lib/auth-server";
import { EDITOR_ROLES } from "@/features/auth/shared/utils/role";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  type BillContentsUpdateInput,
  billContentsUpdateSchema,
  type DifficultyLevel,
} from "../../shared/types/bill-contents";
import { shouldResetReviewOnContentEdit } from "../../shared/utils/omit-admin-only-bill-fields";
import {
  updateBillRecord,
  upsertBillContent,
} from "../repositories/bill-edit-repository";

export type UpdateBillContentsResult =
  | { success: true }
  | { success: false; error: string };

export async function updateBillContents(
  billId: string,
  input: BillContentsUpdateInput
): Promise<UpdateBillContentsResult> {
  try {
    // 議員にも開く（変更は監査ログに残る）
    const admin = await requireRole(EDITOR_ROLES);

    // バリデーション
    const validatedData = billContentsUpdateSchema.parse(input);

    let wroteContent = false;

    // 各難易度レベルのupsertを並行実行
    const upsertPromises = (["normal", "hard"] as DifficultyLevel[]).map(
      async (difficulty) => {
        const data = validatedData[difficulty];

        // 空のコンテンツの場合はスキップ（削除も行わない）
        if (!data.title && !data.summary && !data.content) {
          return;
        }
        wroteContent = true;

        await upsertBillContent(
          {
            billId,
            difficultyLevel: difficulty,
            title: data.title || "",
            summary: data.summary || "",
            content: data.content || "",
          },
          admin
        );
      }
    );

    await Promise.all(upsertPromises);

    // 運営者以外が解説を書き換えたら、確認済みの印を外す（運営者が確認し直す）
    if (wroteContent && shouldResetReviewOnContentEdit(admin.role)) {
      await updateBillRecord(billId, { is_review_completed: false }, admin);
    }

    // web側のキャッシュを無効化
    await invalidateWebCache([WEB_CACHE_TAGS.BILLS]);

    return { success: true };
  } catch (error) {
    console.error("Update bill contents error:", error);
    return {
      success: false,
      error: getErrorMessage(
        error,
        "議案コンテンツの更新中にエラーが発生しました"
      ),
    };
  }
}
