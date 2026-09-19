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

export function labelForDistrict(code: DistrictCode): string {
  return DISTRICT_NAMES[code];
}
