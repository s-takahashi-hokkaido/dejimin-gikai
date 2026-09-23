import type { Database } from "@dejimin-gikai/supabase";

export type Committee = Database["public"]["Tables"]["committees"]["Row"];

export type CommitteeType = Database["public"]["Enums"]["committee_type_enum"];

export type CommitteeWithBillCount = Committee & { bill_count: number };

export const COMMITTEE_TYPE_LABELS: Record<CommitteeType, string> = {
  standing: "常任委員会",
  parliamentary: "議会運営委員会",
  special: "特別委員会（調査・予算・決算）",
};

export type CreateCommitteeInput = {
  name: string;
  committee_type: CommitteeType;
  description: string | null;
  sort_order: number;
};

export type UpdateCommitteeInput = {
  id: string;
  name: string;
  committee_type: CommitteeType;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type DeleteCommitteeInput = {
  id: string;
};
