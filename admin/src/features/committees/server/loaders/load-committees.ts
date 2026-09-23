import "server-only";

import { createAdminClient } from "@dejimin-gikai/supabase";
import type { CommitteeWithBillCount } from "../../shared/types";

export async function loadCommittees(): Promise<CommitteeWithBillCount[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("committees")
    .select(
      `
      id,
      name,
      committee_type,
      description,
      sort_order,
      is_active,
      created_at,
      updated_at,
      bill_committees(count)
    `
    )
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`委員会の取得に失敗しました: ${error.message}`);
  }

  return (
    data?.map((committee) => ({
      id: committee.id,
      name: committee.name,
      committee_type: committee.committee_type,
      description: committee.description,
      sort_order: committee.sort_order,
      is_active: committee.is_active,
      created_at: committee.created_at,
      updated_at: committee.updated_at,
      bill_count: committee.bill_committees?.[0]?.count ?? 0,
    })) || []
  );
}
