import type { MatchAddressContext } from "@/lib/api/client";

export type DistrictCode = NonNullable<MatchAddressContext["district_code"]>;

/* Varna's five administrative districts, keyed by the code the backend uses
   (INSTITUTION_DETAIL_MAP_RESEARCH.md §4.1). */
export const DISTRICT_NAMES: Record<DistrictCode, string> = {
  "01": "Одесос",
  "02": "Приморски",
  "03": "Младост",
  "04": "Владислав Варненчик",
  "05": "Аспарухово",
};

/* Returns null rather than `undefined` stringified into Bulgarian copy. The
   DistrictCode union is compile-time only and comes from a generated file, so
   a sixth code added backend-side — or a data row carrying one — reaches here
   at runtime with nothing to map it to. The caller already has the right
   answer for that case: "районът не е потвърден в източника". */
export function labelForDistrict(code: string | null | undefined): string | null {
  /* hasOwn, not `in`: `in` walks the prototype chain, so a code of "toString"
     would resolve to Object.prototype.toString and print a function body. */
  return code && Object.hasOwn(DISTRICT_NAMES, code)
    ? DISTRICT_NAMES[code as DistrictCode]
    : null;
}
