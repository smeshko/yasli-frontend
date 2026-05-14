import type { InstitutionListItem, MatchInstitution } from "@/lib/api/client";
import type { ReceptionKind } from "@/lib/domain/kinds";
import { receptionKindOrder } from "@/lib/domain/kinds";
import { isSnapshotStale } from "@/lib/domain/freshness";

export type ResultFilter = "all" | ReceptionKind;

export interface GroupedInstitution extends MatchInstitution {
  infantGroupOrigin?: boolean;
}

export type GroupedResults = Record<ReceptionKind, GroupedInstitution[]>;

export function groupMatchResults(institutions: MatchInstitution[]): GroupedResults {
  const grouped = emptyGroupedResults();

  for (const institution of institutions) {
    grouped[institution.kind].push(institution);

    if (institution.kind === "kindergarten" && institution.has_infant_group) {
      grouped.nursery.push({ ...institution, infantGroupOrigin: true });
    }
  }

  for (const kind of receptionKindOrder) {
    grouped[kind].sort((first, second) => first.name.localeCompare(second.name, "bg"));
  }

  return grouped;
}

export function visibleResultKinds(filter: ResultFilter): ReceptionKind[] {
  return filter === "all" ? [...receptionKindOrder] : [filter];
}

export function newestFreshnessDate(institutions: InstitutionListItem[]): Date | null {
  let newest: Date | null = null;

  for (const institution of institutions) {
    const date = new Date(institution.last_seen_at);

    if (Number.isNaN(date.valueOf())) {
      continue;
    }

    if (!newest || date > newest) {
      newest = date;
    }
  }

  return newest;
}

export function shouldShowStaleBanner(
  freshnessDate: Date | null,
  comparisonDate: Date = new Date(),
): boolean {
  return freshnessDate ? isSnapshotStale(freshnessDate, comparisonDate) : false;
}

function emptyGroupedResults(): GroupedResults {
  return {
    nursery: [],
    kindergarten: [],
    preschool: [],
  };
}
