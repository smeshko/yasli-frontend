import { describe, expect, it } from "vitest";

import type { InstitutionListItem, MatchAddressContext, MatchResult } from "@/lib/api/client";

import {
  deriveResultGroupState,
  groupMatchResults,
  hasDistrictFallback,
  newestFreshnessDate,
  shouldShowStaleBanner,
  visibleResultKinds,
} from "./results";

function matchResult(overrides: Partial<MatchResult> = {}): MatchResult {
  const id = overrides.id ?? 1;

  return {
    id,
    external_id: String(id),
    name: "ДГ Тест",
    institution_kind: "kindergarten",
    reception_kind: "kindergarten",
    offering: "standard",
    source_url: `https://example.test/${id}`,
    match_basis: "address",
    has_infant_group: false,
    ...overrides,
  };
}

describe("groupMatchResults", () => {
  it("groups results by canonical reception order and sorts names", () => {
    const institutions: MatchResult[] = [
      matchResult({
        id: 3,
        name: "ПГ Б",
        institution_kind: "preschool",
        reception_kind: "preschool",
        match_basis: "district",
      }),
      matchResult({
        id: 2,
        name: "ДГ Я",
      }),
      matchResult({
        id: 1,
        name: "ДГ А",
      }),
    ];

    const grouped = groupMatchResults(institutions);

    expect(Object.keys(grouped)).toEqual(["nursery", "kindergarten", "preschool"]);
    expect(grouped.kindergarten.map((institution) => institution.name)).toEqual(["ДГ А", "ДГ Я"]);
  });

  it("groups infant-group kindergarten rows by explicit reception kind", () => {
    const institutions: MatchResult[] = [
      matchResult({
        id: 10,
        name: "ДГ №17 Петър Берон",
        source_url: "https://example.test/10",
        has_infant_group: true,
      }),
      matchResult({
        id: 10,
        name: "ДГ №17 Петър Берон",
        institution_kind: "kindergarten",
        reception_kind: "nursery",
        offering: "infant_group",
        source_url: "https://example.test/10",
        has_infant_group: true,
      }),
    ];

    const grouped = groupMatchResults(institutions);

    expect(grouped.kindergarten).toHaveLength(1);
    expect(grouped.kindergarten[0].offering).toBe("standard");

    expect(grouped.nursery).toHaveLength(1);
    expect(grouped.nursery[0].name).toBe("ДГ №17 Петър Берон");
    expect(grouped.nursery[0].source_url).toBe("https://example.test/10");
    expect(grouped.nursery[0].institution_kind).toBe("kindergarten");
    expect(grouped.nursery[0].offering).toBe("infant_group");
  });

  it("does not create frontend nursery rows from kindergarten metadata", () => {
    const institutions: MatchResult[] = [
      matchResult({
        id: 11,
        name: "ДГ №2",
        has_infant_group: true,
      }),
    ];

    const grouped = groupMatchResults(institutions);

    expect(grouped.nursery).toEqual([]);
    expect(grouped.kindergarten).toHaveLength(1);
  });
});

describe("structured result-state helpers", () => {
  it("derives district-known state without fallback", () => {
    const address: MatchAddressContext = {
      id: 1,
      district_code: "01",
      settlement: {
        code: "10135",
        name: "ГР.ВАРНА",
        locality_type: "city",
      },
    };
    const grouped = groupMatchResults([
      matchResult({
        id: 1,
        name: "ДГ Тест",
      }),
    ]);

    expect(deriveResultGroupState(address, grouped.kindergarten)).toEqual({
      isEmpty: false,
      hasMissingDistrictContext: false,
      hasDistrictFallback: false,
      localityType: "city",
    });
  });

  it("derives missing district context without locality-specific behavior", () => {
    const address: MatchAddressContext = {
      id: 2,
      district_code: null,
      settlement: {
        code: "35701",
        name: "С.КАМЕНАР",
        locality_type: "village",
      },
    };

    expect(deriveResultGroupState(address, [])).toEqual({
      isEmpty: true,
      hasMissingDistrictContext: true,
      hasDistrictFallback: false,
      localityType: "village",
    });
  });

  it("detects all-district fallback and mixed-basis groups", () => {
    const districtRows = groupMatchResults([
      matchResult({
        id: 1,
        name: "ПГ Район",
        institution_kind: "preschool",
        reception_kind: "preschool",
        match_basis: "district",
      }),
    ]).preschool;
    const mixedRows = groupMatchResults([
      matchResult({
        id: 1,
        name: "ПГ Адрес",
        institution_kind: "preschool",
        reception_kind: "preschool",
        match_basis: "address",
      }),
      matchResult({
        id: 2,
        name: "ПГ Район",
        institution_kind: "preschool",
        reception_kind: "preschool",
        match_basis: "district",
      }),
    ]).preschool;

    expect(hasDistrictFallback(districtRows)).toBe(true);
    expect(hasDistrictFallback(mixedRows)).toBe(false);
    expect(hasDistrictFallback([])).toBe(false);
  });
});

describe("visibleResultKinds", () => {
  it("returns all kinds for the all filter", () => {
    expect(visibleResultKinds("all")).toEqual(["nursery", "kindergarten", "preschool"]);
  });

  it("returns one kind for a specific filter", () => {
    expect(visibleResultKinds("kindergarten")).toEqual(["kindergarten"]);
  });
});

describe("freshness helpers", () => {
  it("selects the newest valid freshness date", () => {
    const institutions = [
      {
        id: 1,
        external_id: "1",
        name: "ДГ 1",
        kind: "kindergarten",
        source_url: "https://example.test/1",
        last_seen_at: "2026-05-01T00:00:00Z",
      },
      {
        id: 2,
        external_id: "2",
        name: "ДГ 2",
        kind: "kindergarten",
        source_url: "https://example.test/2",
        last_seen_at: "2026-05-05T00:00:00Z",
      },
    ] satisfies InstitutionListItem[];

    expect(newestFreshnessDate(institutions)?.toISOString()).toBe("2026-05-05T00:00:00.000Z");
  });

  it("uses the fourteen-day stale threshold", () => {
    expect(shouldShowStaleBanner(new Date("2026-04-25T00:00:00Z"), new Date("2026-05-11T00:00:00Z"))).toBe(true);
    expect(shouldShowStaleBanner(new Date("2026-04-27T00:00:00Z"), new Date("2026-05-11T00:00:00Z"))).toBe(false);
  });
});
