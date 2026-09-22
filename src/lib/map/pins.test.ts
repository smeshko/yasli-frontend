import { describe, expect, it } from "vitest";

import type { InstitutionBranch } from "@/lib/api/client";

import { fitBoundsFor, toPins, type MapPin } from "./pins";

const main = { lat: 43.209589, lon: 27.926883, precision: "building" } as const;

/* The real ДГ№13 „Мир“ shape: a main building plus four branches, all pinned
   (RESEARCH.md fact 6) — the epic's 5-pin case. */
function mirBranches(): InstitutionBranch[] {
  return [
    branch("бул. Княз Борис I 109", { lat: 43.20726, lon: 27.92377 }),
    branch("ул. Н. Михайловски 1А", { lat: 43.21068, lon: 27.92073 }),
    branch("ул. Тодор Икономов 36", { lat: 43.21402, lon: 27.92561 }),
    branch("ул. Тодор Икономов 26", { lat: 43.21361, lon: 27.92498 }),
  ];
}

function branch(label: string, coords: { lat: number; lon: number } | null): InstitutionBranch {
  return {
    label,
    address: label,
    location: coords ? { ...coords, precision: "building" } : null,
  } as InstitutionBranch;
}

describe("toPins", () => {
  it("puts the main building first, then one pin per pinned branch", () => {
    const pins = toPins(main, mirBranches());

    expect(pins).toHaveLength(5);
    expect(pins[0]).toEqual({ kind: "main", lat: 43.209589, lon: 27.926883 });
    expect(pins.slice(1).every((pin) => pin.kind === "branch")).toBe(true);
    expect(pins[1]).toEqual({ kind: "branch", lat: 43.20726, lon: 27.92377 });
  });

  it("skips branches with no coordinate rather than pinning them at the main", () => {
    const pins = toPins(main, [
      branch("пинната", { lat: 43.21, lon: 27.92 }),
      branch("адресирана, но непинната", null),
      branch("само етикет", null),
    ]);

    expect(pins).toHaveLength(2);
    expect(pins[1]).toEqual({ kind: "branch", lat: 43.21, lon: 27.92 });
  });

  it("returns just the main pin when there are no branches", () => {
    expect(toPins(main, [])).toEqual([{ kind: "main", lat: 43.209589, lon: 27.926883 }]);
  });

  it("returns no pins at all without a main coordinate", () => {
    expect(toPins(null, mirBranches())).toEqual([]);
  });
});

describe("fitBoundsFor", () => {
  it("covers every pin when there are two or more", () => {
    const view = fitBoundsFor(toPins(main, mirBranches()));

    expect(view).toEqual({
      mode: "bounds",
      bounds: [
        [27.92073, 43.20726],
        [27.926883, 43.21402],
      ],
    });
  });

  it("asks for a fixed zoom on a single pin — fitting one point has no meaning", () => {
    expect(fitBoundsFor(toPins(main, []))).toEqual({
      mode: "center",
      center: [27.926883, 43.209589],
    });
  });

  it("has nothing to show without pins", () => {
    expect(fitBoundsFor([])).toBeNull();
  });

  it("does not collapse two pins that share a longitude", () => {
    const pins: MapPin[] = [
      { kind: "main", lat: 43.2, lon: 27.9 },
      { kind: "branch", lat: 43.3, lon: 27.9 },
    ];

    expect(fitBoundsFor(pins)).toEqual({
      mode: "bounds",
      bounds: [
        [27.9, 43.2],
        [27.9, 43.3],
      ],
    });
  });
});
