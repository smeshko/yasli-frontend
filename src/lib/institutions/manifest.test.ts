import { describe, expect, it } from "vitest";

import {
  buildInstitutionSlug,
  buildSlugSet,
  institutionPath,
  manifestToStaticPaths,
  type ManifestEntry,
} from "./manifest";

const entries: ManifestEntry[] = [
  { kind: "nursery", external_id: "47", name: 'ДГ№14 "Дружба"/ с яслена група/' },
  { kind: "kindergarten", external_id: "46", name: 'ДГ№13 "Мир"' },
  { kind: "preschool", external_id: "12", name: "ОУ „Захари Стоянов“ — ПГ" },
];

describe("buildInstitutionSlug", () => {
  it("joins kind and external id with a hyphen", () => {
    expect(buildInstitutionSlug("kindergarten", "46")).toBe("kindergarten-46");
    expect(buildInstitutionSlug("nursery", "47")).toBe("nursery-47");
  });
});

describe("institutionPath", () => {
  it("builds the page path with a trailing slash", () => {
    expect(institutionPath("kindergarten", "46")).toBe("/institution/kindergarten-46/");
  });
});

describe("manifestToStaticPaths", () => {
  it("returns one row per entry with the slug as the only param", () => {
    const paths = manifestToStaticPaths(entries);

    expect(paths).toHaveLength(entries.length);
    expect(paths.map((row) => row.params)).toEqual([
      { slug: "nursery-47" },
      { slug: "kindergarten-46" },
      { slug: "preschool-12" },
    ]);
  });

  it("passes each entry through as props untouched", () => {
    const paths = manifestToStaticPaths(entries);

    paths.forEach((row, index) => {
      expect(row.props).toBe(entries[index]);
    });
  });

  it("returns an empty list for an empty manifest", () => {
    expect(manifestToStaticPaths([])).toEqual([]);
  });
});

describe("buildSlugSet", () => {
  it("holds one slug per entry", () => {
    const slugs = buildSlugSet(entries);

    expect(slugs.size).toBe(entries.length);
    expect(slugs.has("kindergarten-46")).toBe(true);
    expect(slugs.has("nursery-47")).toBe(true);
    expect(slugs.has("preschool-12")).toBe(true);
  });

  it("does not contain slugs outside the list", () => {
    expect(buildSlugSet(entries).has("kindergarten-999999")).toBe(false);
    expect(buildSlugSet([]).has("kindergarten-46")).toBe(false);
  });
});
