import type { Database } from "@dejimin-gikai/supabase";
import { z } from "zod";

// 既存の型を再利用
export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type BillUpdate = Database["public"]["Tables"]["bills"]["Update"];
export type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];

// 公開ステータス型
export type BillPublishStatus = "draft" | "published" | "coming_soon";

// 議案種別（DBの bills_bill_type_check 制約と一致させる）
export const BILL_TYPES = [
  "bill",
  "bill_settlement",
  "bill_personnel",
  "bill_ratification",
  "consultation",
  "opinion",
  "resolution",
  "petition",
  "appeal",
  "report",
  "member_bill",
] as const;
export type BillType = (typeof BILL_TYPES)[number];

// 共通のバリデーションスキーマ
const billBaseSchema = z.object({
  bill_number: z.string().max(50, "議案番号は50文字以内で入力してください"),
  bill_type: z.enum(BILL_TYPES),
  name: z
    .string()
    .min(1, "議案名は必須です")
    .max(200, "議案名は200文字以内で入力してください"),
  // web の議案詳細で href に使うため http(s) のみ許可する
  source_url: z
    .url({
      protocol: /^https?$/,
      message: "http:// または https:// で始まるURLを入力してください",
    })
    .trim()
    .max(2000, "出典URLは2000文字以内で入力してください")
    .nullable(),
  status: z.enum([
    "preparing",
    "submitted",
    "in_committee",
    "plenary_session",
    "approved",
    "rejected",
    "adopted",
    "partially_adopted",
    "reported",
  ]),
  status_note: z
    .string()
    .max(500, "ステータス備考は500文字以内で入力してください")
    .nullable(),
  published_at: z.string().optional(),
  thumbnail_url: z.string().nullable().optional(),
  share_thumbnail_url: z.string().nullable().optional(),
  is_featured: z.boolean(),
  // 付託委員会（補正予算や決算は複数の委員会に付託される）。bills の列ではなく bill_committees に保存する
  committee_ids: z.array(z.string().uuid()),
  council_session_id: z.string().uuid().nullable().optional(),
});

// 更新用スキーマ（既存）
export const billUpdateSchema = billBaseSchema;
export type BillUpdateInput = z.infer<typeof billUpdateSchema>;

// 新規作成用スキーマ
export const billCreateSchema = billBaseSchema;
export type BillCreateInput = z.infer<typeof billCreateSchema>;
