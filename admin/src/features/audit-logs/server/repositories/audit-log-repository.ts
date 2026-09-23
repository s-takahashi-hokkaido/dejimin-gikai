import "server-only";

import { createAdminClient } from "@dejimin-gikai/supabase";
import type { AuditTargetTable } from "../../shared/types";

export async function findAuditLogs(params: {
  table: AuditTargetTable | null;
  billId: string | null;
  offset: number;
  limit: number;
}) {
  const supabase = createAdminClient();
  let query = supabase
    .from("admin_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.table) {
    query = query.eq("target_table", params.table);
  }
  if (params.billId) {
    query = query.eq("bill_id", params.billId);
  }

  const { data, error, count } = await query;

  // 範囲外のページ（件数より後ろ）は PostgREST が 416 を返す。空の結果として扱う
  if (error?.code === "PGRST103") {
    return { logs: [], total: await countAuditLogs(params) };
  }

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  return { logs: data ?? [], total: count ?? 0 };
}

async function countAuditLogs(params: {
  table: AuditTargetTable | null;
  billId: string | null;
}) {
  const supabase = createAdminClient();
  let query = supabase
    .from("admin_audit_logs")
    .select("*", { count: "exact", head: true });

  if (params.table) {
    query = query.eq("target_table", params.table);
  }
  if (params.billId) {
    query = query.eq("bill_id", params.billId);
  }

  const { error, count } = await query;

  if (error) {
    throw new Error(`Failed to count audit logs: ${error.message}`);
  }

  return count ?? 0;
}

export async function findBillNamesByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("id, name")
    .in("id", ids);

  if (error) {
    throw new Error(`Failed to fetch bill names: ${error.message}`);
  }

  return new Map((data ?? []).map((bill) => [bill.id, bill.name]));
}

export async function findCommitteeNamesByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committees")
    .select("id, name")
    .in("id", ids);

  if (error) {
    throw new Error(`Failed to fetch committee names: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((committee) => [committee.id, committee.name])
  );
}

export async function findFactionNamesByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("factions")
    .select("id, display_name")
    .in("id", ids);

  if (error) {
    throw new Error(`Failed to fetch faction names: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((faction) => [faction.id, faction.display_name])
  );
}
