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

describe("groupMatchResults", () => {
  it("groups results by canonical reception order and sorts names", () => {
    const institutions: MatchResult[] = [
      {
        id: 3,
        external_id: "3",
        name: "ПГ Б",
        institution_kind: "preschool",
        source_url: "https://example.test/3",
        match_basis: "district",
        has_infant_group: false,
      },
      {
        id: 2,
        external_id: "2",
        name: "ДГ Я",
        institution_kind: "kindergarten",
        source_url: "https://example.test/2",
        match_basis: "address",
        has_infant_group: false,
      },
      {
        id: 1,
        external_id: "1",
        name: "ДГ А",
        institution_kind: "kindergarten",
        source_url: "https://example.test/1",
        match_basis: "address",
        has_infant_group: false,
      },
    ];

    const grouped = groupMatchResults(institutions);

    expect(Object.keys(grouped)).toEqual(["nursery", "kindergarten", "preschool"]);
    expect(grouped.kindergarten.map((institution) => institution.name)).toEqual(["ДГ А", "ДГ Я"]);
  });

  it("surfaces an infant-group kindergarten in both the nursery and kindergarten buckets", () => {
    const institutions: MatchResult[] = [
      {
        id: 10,
        external_id: "10",
        name: "ДГ №17 Петър Берон",
        institution_kind: "kindergarten",
        source_url: "https://example.test/10",
        match_basis: "address",
        has_infant_group: true,
      },
    ];

    const grouped = groupMatchResults(institutions);

    expect(grouped.kindergarten).toHaveLength(1);
    expect(grouped.kindergarten[0].infantGroupOrigin).toBeUndefined();

    expect(grouped.nursery).toHaveLength(1);
    expect(grouped.nursery[0].name).toBe("ДГ №17 Петър Берон");
    expect(grouped.nursery[0].source_url).toBe("https://example.test/10");
    expect(grouped.nursery[0].institution_kind).toBe("kindergarten");
    expect(grouped.nursery[0].infantGroupOrigin).toBe(true);
  });

  it("does not duplicate kindergartens that do not run an infant group", () => {
    const institutions: MatchResult[] = [
      {
        id: 11,
        external_id: "11",
        name: "ДГ №2",
        institution_kind: "kindergarten",
        source_url: "https://example.test/11",
        match_basis: "address",
        has_infant_group: false,
      },
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
      {
        id: 1,
        external_id: "1",
        name: "ДГ Тест",
        institution_kind: "kindergarten",
        source_url: "https://example.test/1",
        match_basis: "address",
        has_infant_group: false,
      },
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
      {
        id: 1,
        external_id: "1",
        name: "ПГ Район",
        institution_kind: "preschool",
        source_url: "https://example.test/1",
        match_basis: "district",
        has_infant_group: false,
      },
    ]).preschool;
    const mixedRows = groupMatchResults([
      {
        id: 1,
        external_id: "1",
        name: "ПГ Адрес",
        institution_kind: "preschool",
        source_url: "https://example.test/1",
        match_basis: "address",
        has_infant_group: false,
      },
      {
        id: 2,
        external_id: "2",
        name: "ПГ Район",
        institution_kind: "preschool",
        source_url: "https://example.test/2",
        match_basis: "district",
        has_infant_group: false,
      },
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
