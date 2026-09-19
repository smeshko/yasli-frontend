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
 * listed under nurseries resolves the kindergarten it belongs to.
 *
 * One institution can appear in two groups at once: a kindergarten with an
 * infant group is a `standard` row under kindergartens and an `infant_group`
 * row under nurseries, and the two can carry different bases — the
 * kindergarten serves the address while its infant group is district-routed.
 * An address match is the stronger, more specific statement and is what the
 * search screen showed, so it wins regardless of group order; taking the
 * first row in `receptionKindOrder` would tell the parent "по район" for the
 * institution that actually covers their street.
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

  let fallbackBasis: MatchResult["match_basis"] | null = null;

  for (const groupKind of receptionKindOrder) {
    for (const result of grouped[groupKind] ?? []) {
      if (result.institution_kind !== kind || result.external_id !== externalId) {
        continue;
      }

      if (result.match_basis === "address") {
        return { addressLabel: selectedAddress.label, matchBasis: "address" };
      }

      fallbackBasis ??= result.match_basis;
    }
  }

  return fallbackBasis
    ? { addressLabel: selectedAddress.label, matchBasis: fallbackBasis }
    : null;
}
