import type { Database } from "@dejimin-gikai/supabase";

type BillStatus = Database["public"]["Enums"]["bill_status_enum"];

export type SeedBillContent = {
  title: string;
  summary: string;
  content: string;
};

export type SeedBill = {
  /** 議案等一覧の表記どおり（例: 「議案第1号」「請願第52号～65号」） */
  billNumber: string;
  billType: string;
  name: string;
  /** 原案PDFの絶対URL */
  sourceUrl: string;
  status: BillStatus;
  statusNote: string | null;
  publishedAt: string;
  isFeatured: boolean;
  /** 付託委員会（committees.name）。分割付託は全委員会を列挙する */
  committees: string[];
  /**
   * 本会議で反対した会派（factions.name）。審議結果PDFの注記による。
   * 採決のある議案では、ここにない会派を賛成として登録する。
   */
  againstFactions: string[];
  /** tags.label */
  tags: string[];
  contents: {
    normal: SeedBillContent;
    hard: SeedBillContent;
  };
};

export type SeedSession = {
  slug: string;
  name: string;
  startDate: string;
  endDate: string;
  councilUrl: string;
  isActive: boolean;
  bills: SeedBill[];
};
