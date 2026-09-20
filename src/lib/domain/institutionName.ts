/* The ДГ/ДЯ number lives in the name, not in the source's DZ_NUMBER field
   (which tracks an internal id). Real names put the № almost anywhere —
   `ДГ №13 „Мир“`, `ДЯ № 4 „Пчелица“`, `ДГ Мир №13`, `ЯСЛА №3`, `ДГ№13 "Мир"` —
   so this looks for `№` followed by digits wherever it sits and never rewrites
   or splits the name. */
const INSTITUTION_NUMBER = /№\s*(\d+)/u;

export function parseInstitutionNumber(name: string): string | null {
  const match = INSTITUTION_NUMBER.exec(name);

  return match ? match[1] : null;
}
