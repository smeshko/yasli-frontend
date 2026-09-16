import type { MatchState } from "@/components/SearchExperience";
import type { MatchResult } from "@/lib/api/client";
import { receptionKindOrder, type ReceptionKind } from "@/lib/domain/kinds";

/* Also read — as a literal — by the pre-paint script in
   src/layouts/BaseLayout.astro, which checks the stored status before first
   paint. A key bump changes both places. */
export const SEARCH_STATE_STORAGE_KEY = "yasli:search-state:v2";

/* The filter is deliberately not in here. It is a way of looking at one set of
   results, not part of the search — coming back to the tab with two of the
   three groups silently hidden reads as missing data, not as a filter someone
   left on. Restoring the address and its results is the useful half. */
export interface StoredSearchState {
  query: string;
  matchState: MatchState | null;
}

export interface StoredMatchContext {
  addressLabel: string;
  matchBasis: MatchResult["match_basis"];
}

export function loadStoredSearchState(): StoredSearchState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(SEARCH_STATE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSearchState) : null;
  } catch {
    return null;
  }
}

export function saveStoredSearchState(state: StoredSearchState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(SEARCH_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* sessionStorage unavailable or quota exceeded — drop silently */
  }
}

/**
 * The "serves your address" context for an institution page: the address the
 * last successful search was for, and how this institution matched it. `null`
 * when there is no stored search, it did not succeed, or this institution was
 * not in its results. Matches on `institution_kind`, so an infant-group row
 * listed under nurseries resolves the kindergarten it belongs to; groups are
 * walked in `receptionKindOrder`, so the first row seen wins.
 */
export function findStoredMatchContext(
  stored: StoredSearchState | null,
  kind: ReceptionKind,
  externalId: string,
): StoredMatchContext | null {
  const matchState = stored?.matchState;

  if (!matchState || matchState.status !== "success") {
    return null;
  }

  const { selectedAddress, grouped } = matchState;

  if (!selectedAddress || !grouped) {
    return null;
  }

  for (const groupKind of receptionKindOrder) {
    for (const result of grouped[groupKind] ?? []) {
      if (result.institution_kind === kind && result.external_id === externalId) {
        return { addressLabel: selectedAddress.label, matchBasis: result.match_basis };
      }
    }
  }

  return null;
}
