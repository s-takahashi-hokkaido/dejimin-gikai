import { BILL_TYPES, type BillType } from "../types";

/**
 * DBの bill_type（text型）をフォーム用の BillType に変換する。
 * 未知の値は通常議案（bill）として扱う。
 */
export function toBillType(value: string): BillType {
  return (BILL_TYPES as readonly string[]).includes(value)
    ? (value as BillType)
    : "bill";
}
