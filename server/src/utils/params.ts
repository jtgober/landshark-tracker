/**
 * Normalize Express param (string | string[]) to string for use in DB args.
 * Ensures InArgs types satisfy libsql's InValue (no string[]).
 */
export function param(value: string | string[] | undefined): string {
  if (value === undefined) return '';
  return Array.isArray(value) ? value[0] ?? '' : value;
}
