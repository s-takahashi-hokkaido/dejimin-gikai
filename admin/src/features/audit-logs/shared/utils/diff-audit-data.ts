import type { AuditJson } from "../types";

type Json = AuditJson;

export type AuditFieldChange = {
  field: string;
  before: Json | undefined;
  after: Json | undefined;
};

/** 差分として見せても意味のない列（トリガー側でも updated_at だけの変更は記録しない） */
const IGNORED_FIELDS = new Set(["id", "created_at", "updated_at"]);

function toRecord(data: Json | null): Record<string, Json | undefined> {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data;
  }
  return {};
}

function isSameValue(a: Json | undefined, b: Json | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * 変更前後の行から、値が変わった列を返す
 *
 * 作成（before が null）なら値のある列すべて、削除（after が null）なら
 * 値のあった列すべてを返す。列の順序は行の列順に従う。
 */
export function diffAuditData(
  before: Json | null,
  after: Json | null
): AuditFieldChange[] {
  const beforeRecord = toRecord(before);
  const afterRecord = toRecord(after);
  const fields = [
    ...new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]),
  ];

  return fields
    .filter((field) => !IGNORED_FIELDS.has(field))
    .filter((field) => !isSameValue(beforeRecord[field], afterRecord[field]))
    .map((field) => ({
      field,
      before: beforeRecord[field],
      after: afterRecord[field],
    }));
}
