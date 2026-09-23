import { requireRole } from "@/features/auth/server/lib/auth-server";
import { EDITOR_ROLES } from "@/features/auth/shared/utils/role";
import type { BillContent } from "../../shared/types/bill-contents";
import { findBillContentsByBillId } from "../repositories/bill-edit-repository";

export async function getBillContents(billId: string): Promise<BillContent[]> {
  try {
    // 議案コンテンツの編集画面は議員にも開く
    await requireRole(EDITOR_ROLES);

    return await findBillContentsByBillId(billId);
  } catch (error) {
    console.error("Get bill contents error:", error);
    throw error;
  }
}
