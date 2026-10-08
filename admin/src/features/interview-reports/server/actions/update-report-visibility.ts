"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  invalidateWebCache,
  WEB_CACHE_TAGS,
} from "@/lib/utils/cache-invalidation";
import { updateReportVisibility } from "../repositories/interview-report-repository";

interface UpdateReportVisibilityParams {
  reportId: string;
  isPublic: boolean;
  billId: string;
  sessionId: string;
}

interface UpdateReportVisibilityResult {
  success: boolean;
  error?: string;
}

export async function updateReportVisibilityAction(
  params: UpdateReportVisibilityParams
): Promise<UpdateReportVisibilityResult> {
  await requireAdmin();

  const { reportId, isPublic, billId, sessionId } = params;

  if (!reportId) {
    return {
      success: false,
      error: "レポートIDが必要です",
    };
  }

  try {
    await updateReportVisibility(reportId, isPublic);

    // Revalidate the detail page and list page
    revalidatePath(`/bills/${billId}/reports/${sessionId}`);
    revalidatePath(`/bills/${billId}/reports`);
    revalidateTag("public-interview-reports");
    // admin の revalidateTag は admin 内のキャッシュにしか効かない。
    // web の議案一覧が持つ回答数・公開レポートのキャッシュは HTTP 経由で無効化する。
    await invalidateWebCache([WEB_CACHE_TAGS.PUBLIC_INTERVIEW_REPORTS]);

    return { success: true };
  } catch (error) {
    console.error("Error updating report visibility:", error);
    return {
      success: false,
      error: "公開状態の更新に失敗しました",
    };
  }
}
