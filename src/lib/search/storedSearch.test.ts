import { describe, expect, it } from "vitest";

import type { MatchState } from "@/components/SearchExperience";
import type { MatchResult } from "@/lib/api/client";
import { groupMatchResults } from "@/lib/search/results";

import {
  SEARCH_STATE_STORAGE_KEY,
  findStoredMatchContext,
  type StoredSearchState,
} from "./storedSearch";

function matchResult(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    id: 1,
    external_id: "46",
    name: "ДГ№13 „Мир“",
    institution_kind: "kindergarten",
    reception_kind: "kindergarten",
    offering: "standard",
    source_url: "https://example.test/46",
    match_basis: "address",
    has_infant_group: false,
    ...overrides,
  };
}

function storedSearch(results: MatchResult[], overrides: Partial<MatchState> = {}): StoredSearchState {
  return {
    query: "ул. Преслав 012",
    matchState: {
      status: "success",
      address: { id: 1, district_code: "01", settlement: null },
      grouped: groupMatchResults(results),
      selectedAddress: {
        id: "1",
        addressId: 1,
        streetId: 1,
        label: "ул. Преслав 012",
        context: "гр.Варна",
        numberLabel: "012",
        searchText: "ул. преслав 012",
      },
      ...overrides,
    },
  };
}

describe("SEARCH_STATE_STORAGE_KEY", () => {
  it("is the key BaseLayout's pre-paint script reads", () => {
    expect(SEARCH_STATE_STORAGE_KEY).toBe("yasli:search-state:v2");
  });
});

describe("findStoredMatchContext", () => {
  it("returns the searched address and an address basis", () => {
    const stored = storedSearch([matchResult()]);

    expect(findStoredMatchContext(stored, "kindergarten", "46")).toEqual({
      addressLabel: "ул. Преслав 012",
      matchBasis: "address",
    });
  });

  it("returns a district basis for a district match", () => {
    const stored = storedSearch([
      matchResult({
        id: 7,
        external_id: "4",
        institution_kind: "nursery",
        reception_kind: "nursery",
        match_basis: "district",
      }),
    ]);

    expect(findStoredMatchContext(stored, "nursery", "4")).toEqual({
      addressLabel: "ул. Преслав 012",
      matchBasis: "district",
    });
  });

  it("returns null for an empty store", () => {
    expect(findStoredMatchContext(null, "kindergarten", "46")).toBeNull();
    expect(findStoredMatchContext({ query: "", matchState: null }, "kindergarten", "46")).toBeNull();
  });

  it.each(["idle", "loading", "error", "stale"] as const)(
    "returns null when the stored status is %s",
    (status) => {
      const stored = storedSearch([matchResult()], { status });

      expect(findStoredMatchContext(stored, "kindergarten", "46")).toBeNull();
    },
  );

  it("returns null without a selected address", () => {
    const stored = storedSearch([matchResult()], { selectedAddress: null });

    expect(findStoredMatchContext(stored, "kindergarten", "46")).toBeNull();
  });

  it("returns null without grouped results", () => {
    const stored = storedSearch([matchResult()], { grouped: null });

    expect(findStoredMatchContext(stored, "kindergarten", "46")).toBeNull();
  });

  it("returns null for an institution outside the results", () => {
    const stored = storedSearch([matchResult()]);

    expect(findStoredMatchContext(stored, "kindergarten", "47")).toBeNull();
    expect(findStoredMatchContext(stored, "nursery", "46")).toBeNull();
  });

  it("matches on institution_kind so an infant-group row resolves the kindergarten", () => {
    const stored = storedSearch([
      matchResult({
        id: 2,
        institution_kind: "kindergarten",
        reception_kind: "nursery",
        offering: "infant_group",
        match_basis: "district",
      }),
    ]);

    expect(findStoredMatchContext(stored, "kindergarten", "46")).toEqual({
      addressLabel: "ул. Преслав 012",
      matchBasis: "district",
    });
  });

  /* A kindergarten with an infant group is two rows in two groups, and they
     can disagree: the kindergarten serves the street, its infant group is
     routed by район. The nursery group is walked first, so first-row-wins
     would say "по район" about an institution the search screen had just
     shown as an exact address match. */
  it("prefers the address basis when a kindergarten is present twice", () => {
    const stored = storedSearch([
      matchResult({ id: 1, match_basis: "address" }),
      matchResult({
        id: 2,
        reception_kind: "nursery",
        offering: "infant_group",
        match_basis: "district",
      }),
    ]);

    expect(findStoredMatchContext(stored, "kindergarten", "46")).toEqual({
      addressLabel: "ул. Преслав 012",
      matchBasis: "address",
    });
  });

  it("keeps the district basis when no row matched by address", () => {
    const stored = storedSearch([
      matchResult({ id: 1, match_basis: "district" }),
      matchResult({
        id: 2,
        reception_kind: "nursery",
        offering: "infant_group",
        match_basis: "district",
      }),
    ]);

    expect(findStoredMatchContext(stored, "kindergarten", "46")?.matchBasis).toBe("district");
  });
});
