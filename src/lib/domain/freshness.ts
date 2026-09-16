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

/* Shared by the search results and the institution page. */
export const STALE_BANNER_TEXT = `Данните са по-стари от ${STALE_BANNER_THRESHOLD_DAYS} дни. Проверете и официалния източник преди кандидатстване.`;

export function formatFreshnessDate(date: Date): string {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
