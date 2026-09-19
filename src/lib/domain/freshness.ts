export const STALE_BANNER_THRESHOLD_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isSnapshotStale(freshnessDate: Date | string, comparisonDate: Date | string): boolean {
  const ageInDays =
    (toUtcStartOfDay(comparisonDate) - toUtcStartOfDay(freshnessDate)) / MS_PER_DAY;

  return ageInDays > STALE_BANNER_THRESHOLD_DAYS;
}

function toUtcStartOfDay(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.valueOf())) {
    throw new Error("snapshot freshness date must be valid");
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/* `last_seen_at` is typed as a bare string with no format guarantee, and both
   helpers above and below throw on an unparsable one. In the institution
   island that throw lands in the commit render, React tears down the island
   root, and the page is left with its static header and nothing underneath —
   the one failure mode the state machine cannot show. Parse at the boundary
   instead and treat unparsable as "freshness unknown". */
export function parseFreshnessDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.valueOf()) ? null : date;
}

/* Shared by the search results and the institution page. */
export const STALE_BANNER_TEXT = `Данните са по-стари от ${STALE_BANNER_THRESHOLD_DAYS} дни. Проверете и официалния източник преди кандидатстване.`;

export function formatFreshnessDate(date: Date): string {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
