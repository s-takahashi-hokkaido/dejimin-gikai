const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * UUID の形をしているか
 *
 * URL のパラメータなどをそのまま uuid 列の検索に渡すと、DB が型エラーを返して 500 になる。
 * 先にこれで確かめ、形が違えば「見つからない」として扱う。
 */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
