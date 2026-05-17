import type { InstitutionListItem, MatchAddressContext, MatchResult } from "@/lib/api/client";
import type { ReceptionKind } from "@/lib/domain/kinds";
import { receptionKindOrder } from "@/lib/domain/kinds";
import { isSnapshotStale } from "@/lib/domain/freshness";

export type ResultFilter = "all" | ReceptionKind;

export type MatchLocalityType = NonNullable<MatchAddressContext["settlement"]>["locality_type"];

export type GroupedInstitution = MatchResult;

export type GroupedResults = Record<ReceptionKind, GroupedInstitution[]>;

export interface ResultGroupState {
  isEmpty: boolean;
  hasMissingDistrictContext: boolean;
  hasDistrictFallback: boolean;
  localityType: MatchLocalityType | null;
}

export function groupMatchResults(results: MatchResult[]): GroupedResults {
  const grouped = emptyGroupedResults();

  for (const institution of results) {
    grouped[institution.reception_kind].push(institution);
  }

  for (const kind of receptionKindOrder) {
    grouped[kind].sort((first, second) => first.name.localeCompare(second.name, "bg"));
  }

  return grouped;
}

export function deriveResultGroupState(
  address: MatchAddressContext,
  institutions: GroupedInstitution[],
): ResultGroupState {
  return {
    isEmpty: institutions.length === 0,
    hasMissingDistrictContext: address.district_code === null,
    hasDistrictFallback: hasDistrictFallback(institutions),
    localityType: address.settlement?.locality_type ?? null,
  };
}

export function hasDistrictFallback(institutions: GroupedInstitution[]): boolean {
  return institutions.length > 0 && institutions.every((item) => item.match_basis === "district");
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
