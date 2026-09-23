"use client";

import type { Control } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BillStatus } from "@/features/bills/shared/types";
import type { Committee } from "@/features/committees/shared/types";
import type { CouncilSession } from "@/features/council-sessions/shared/types";
import type { BillCreateInput, BillType } from "../../shared/types";
import { selectCommitteeOptions } from "../../shared/utils/select-committee-options";
import { ThumbnailUpload } from "./thumbnail-upload";

const BILL_STATUS_OPTIONS: Array<{ value: BillStatus; label: string }> = [
  { value: "preparing", label: "議案上程前" },
  { value: "submitted", label: "上程済み" },
  { value: "in_committee", label: "委員会審査中" },
  { value: "plenary_session", label: "本会議採決中" },
  { value: "approved", label: "可決" },
  { value: "rejected", label: "否決" },
  { value: "adopted", label: "採択" },
  { value: "partially_adopted", label: "趣旨採択" },
  { value: "reported", label: "専決処分報告" },
];

const BILL_TYPE_OPTIONS: Array<{ value: BillType; label: string }> = [
  { value: "bill", label: "議案（条例・予算・契約など）" },
  { value: "bill_settlement", label: "議案（決算認定）" },
  { value: "bill_personnel", label: "議案（人事同意）" },
  { value: "bill_ratification", label: "議案（専決処分の承認）" },
  { value: "member_bill", label: "議員提出議案" },
  { value: "opinion", label: "意見書案" },
  { value: "resolution", label: "決議案" },
  { value: "consultation", label: "諮問" },
  { value: "petition", label: "請願" },
  { value: "appeal", label: "陳情" },
  { value: "report", label: "報告" },
];

interface BillFormFieldsProps {
  control: Control<BillCreateInput>;
  billId?: string;
  councilSessions: CouncilSession[];
  committees: Committee[];
}

export function BillFormFields({
  control,
  billId,
  councilSessions,
  committees,
}: BillFormFieldsProps) {
  return (
    <>
      <FormField
        control={control}
        name="bill_number"
        render={({ field }) => (
          <FormItem>
            <FormLabel>議案番号 *</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ""} />
            </FormControl>
            <FormDescription>
              議案等一覧の表記どおりに入力してください（例:「議案第1号」「意見書案第1号」「陳情第253号～359号」）。未設定の場合は空白のままにしてください。
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="bill_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>議案種別 *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="議案種別を選択" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {BILL_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              議案番号の種類に合わせて選択してください。同じ定例会で議案番号と議案種別の組み合わせは重複できません
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>議案名 *</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormDescription>
              議案の正式名称を入力してください（最大200文字）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="source_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>出典URL（議案原文）</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="https://www.city.sapporo.jp/gikai/html/documents/..."
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value.trim() === "" ? null : e.target.value
                  )
                }
              />
            </FormControl>
            <FormDescription>
              議案原文PDFのURLを入力してください（任意）。公開ページに「議案原文（PDF）」リンクとして表示されます
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ステータス *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="ステータスを選択" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {BILL_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>現在の審議状況を選択してください</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="status_note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ステータス備考</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value || ""}
                className="min-h-[100px]"
              />
            </FormControl>
            <FormDescription>
              審議状況の詳細や補足情報を入力してください（最大500文字）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="published_at"
        render={({ field }) => (
          <FormItem>
            <FormLabel>公開日時 *</FormLabel>
            <FormControl>
              <Input type="datetime-local" {...field} />
            </FormControl>
            <FormDescription>
              議案が公開される日時を設定してください
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="thumbnail_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>サムネイル画像</FormLabel>
            <FormControl>
              <ThumbnailUpload
                value={field.value}
                onChange={field.onChange}
                billId={billId}
              />
            </FormControl>
            <FormDescription>
              議案のサムネイル画像を設定してください（任意）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="share_thumbnail_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>シェア用OGP画像</FormLabel>
            <FormControl>
              <ThumbnailUpload
                value={field.value}
                onChange={field.onChange}
                billId={billId}
                storagePrefix="share"
              />
            </FormControl>
            <FormDescription>
              Twitter等のSNSでシェアされた際に表示される画像を設定してください（任意）。設定しない場合はサムネイル画像が使用されます。
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="committee_ids"
        render={({ field }) => {
          const selectedIds = field.value ?? [];
          const toggle = (committeeId: string, checked: boolean) =>
            field.onChange(
              checked
                ? [...selectedIds, committeeId]
                : selectedIds.filter((id) => id !== committeeId)
            );

          return (
            <FormItem>
              <FormLabel>付託委員会</FormLabel>
              <div className="grid grid-cols-1 gap-2 rounded-md border p-4 sm:grid-cols-2">
                {selectCommitteeOptions(committees, selectedIds).map(
                  (committee) => (
                    <FormItem
                      key={committee.id}
                      className="flex flex-row items-center space-x-2 space-y-0"
                    >
                      <FormControl>
                        <Checkbox
                          checked={selectedIds.includes(committee.id)}
                          onCheckedChange={(checked) =>
                            toggle(committee.id, checked === true)
                          }
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {committee.name}
                        {!committee.is_active && "（無効）"}
                      </FormLabel>
                    </FormItem>
                  )
                )}
              </div>
              <FormDescription>
                付託された委員会をすべて選択してください（任意）。補正予算は複数の常任委員会、決算は第一部・第二部の決算特別委員会に分割付託されることがあります
              </FormDescription>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <FormField
        control={control}
        name="council_session_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>定例会</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? undefined}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="定例会を選択" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {councilSessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}（{session.start_date}〜{session.end_date}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              議案が上程された定例会を選択してください
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="is_featured"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>注目の議案</FormLabel>
              <FormDescription>
                トップページなどで優先的に表示されます
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
    </>
  );
}
