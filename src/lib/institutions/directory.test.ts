import { describe, expect, it } from "vitest";

import type { InstitutionListItem } from "../api/client";
import { buildDirectoryGroups } from "./directory";

function item(
  kind: InstitutionListItem["kind"],
  externalId: string,
  name: string,
  hasInfantGroup = false,
): InstitutionListItem {
  return {
    id: Number(externalId) || 1,
    external_id: externalId,
    name,
    kind,
    source_url: "https://example.test/",
    last_seen_at: "2026-01-01T00:00:00Z",
    has_infant_group: hasInfantGroup,
    location: null,
  };
}

const allSlugs = new Set(["kindergarten-46", "kindergarten-55", "kindergarten-38", "kindergarten-42", "nursery-4"]);

describe("buildDirectoryGroups", () => {
  it("orders groups nursery, kindergarten, preschool whatever the input order and drops empty kinds", () => {
    const groups = buildDirectoryGroups(
      [item("preschool", "12", "ОУ А"), item("nursery", "4", "ДЯ № 4"), item("preschool", "11", "ОУ Б")],
      allSlugs,
    );
    expect(groups.map((group) => [group.kind, group.label])).toEqual([
      ["nursery", "Ясла"],
      ["preschool", "Подготвителна група"],
    ]);
  });

  it("sorts names numeric-aware within a group", () => {
    const groups = buildDirectoryGroups(
      [
        item("kindergarten", "55", "ДГ№22"),
        item("kindergarten", "38", "ДГ№5"),
        item("kindergarten", "46", "ДГ№13"),
        item("kindergarten", "42", "ДГ№9"),
      ],
      allSlugs,
    );
    expect(groups[0].rows.map((row) => row.name)).toEqual(["ДГ№5", "ДГ№9", "ДГ№13", "ДГ№22"]);
  });

  it("links a row only when its slug has a page", () => {
    const groups = buildDirectoryGroups(
      [item("kindergarten", "46", "ДГ№13"), item("kindergarten", "999999", "ДГ№60")],
      allSlugs,
    );
    expect(groups[0].rows.map((row) => [row.key, row.href])).toEqual([
      ["kindergarten-46", "/institution/kindergarten-46/"],
      ["kindergarten-999999", null],
    ]);
  });

  it("mirrors has_infant_group and leaves the input order alone", () => {
    const input = [item("kindergarten", "42", "ДГ№9"), item("kindergarten", "38", "ДГ№5", true)];
    const groups = buildDirectoryGroups(input, allSlugs);
    expect(groups[0].rows.map((row) => row.hasInfantGroup)).toEqual([true, false]);
    expect(input.map((entry) => entry.name)).toEqual(["ДГ№9", "ДГ№5"]);
  });
});
