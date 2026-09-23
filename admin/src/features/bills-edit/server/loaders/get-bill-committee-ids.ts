import { findBillCommitteeIdsByBillId } from "../repositories/bill-edit-repository";

/**
 * 議案の付託委員会IDの配列を取得する
 */
export async function getBillCommitteeIds(billId: string): Promise<string[]> {
  return findBillCommitteeIdsByBillId(billId);
}
