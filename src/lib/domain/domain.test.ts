import { describe, expect, it } from "vitest";

import { formatAddressNumber } from "./address";
import { isSnapshotStale } from "./freshness";
import { labelForReceptionKind, receptionKindLabels, receptionKindOrder } from "./kinds";

describe("reception kind helpers", () => {
  it("keeps the canonical display order", () => {
    expect(receptionKindOrder).toEqual(["nursery", "kindergarten", "preschool"]);
  });

  it("returns Bulgarian labels", () => {
    expect(labelForReceptionKind("nursery")).toBe("Ясла");
    expect(receptionKindLabels.kindergarten).toBe("Детска градина");
    expect(labelForReceptionKind("preschool")).toBe("Подготвителна група");
  });
});

describe("formatAddressNumber", () => {
  it("preserves suffix and entrance", () => {
    expect(
      formatAddressNumber({
        number_int: 2,
        number_suffix: "А",
        entrance: "01",
      }),
    ).toBe("002А вх.01");
  });
});

describe("isSnapshotStale", () => {
  it("marks data stale only after fourteen days", () => {
    expect(isSnapshotStale("2026-04-30", "2026-05-15")).toBe(true);
    expect(isSnapshotStale("2026-05-01", "2026-05-15")).toBe(false);
  });
});
