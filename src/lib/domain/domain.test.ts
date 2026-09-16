import { describe, expect, it } from "vitest";

import { formatAddressNumber } from "./address";
import { DISTRICT_NAMES, labelForDistrict } from "./districts";
import { STALE_BANNER_TEXT, formatFreshnessDate, isSnapshotStale } from "./freshness";
import { parseInstitutionNumber } from "./institutionName";
import { labelForReceptionKind, receptionKindLabels, receptionKindOrder } from "./kinds";
import { normalizeWebsiteUrl } from "./website";

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

describe("parseInstitutionNumber", () => {
  it.each([
    ["ДГ №13 „Мир“", "13"],
    ["ДЯ № 4 „Пчелица“", "4"],
    ["ДГ Мир №13", "13"],
    ["ЯСЛА №3", "3"],
    ['ДГ№13 "Мир"', "13"],
  ])("parses %s as %s", (name, expected) => {
    expect(parseInstitutionNumber(name)).toBe(expected);
  });

  it("returns null when the name carries no number", () => {
    expect(parseInstitutionNumber("ОУ „Захари Стоянов“ — ПГ")).toBeNull();
    expect(parseInstitutionNumber("ДЯ Море")).toBeNull();
  });
});

describe("district names", () => {
  it("has exactly the five Varna districts", () => {
    expect(Object.keys(DISTRICT_NAMES)).toEqual(["01", "02", "03", "04", "05"]);
  });

  it("labels every code", () => {
    expect(labelForDistrict("01")).toBe("Одесос");
    expect(labelForDistrict("02")).toBe("Приморски");
    expect(labelForDistrict("03")).toBe("Младост");
    expect(labelForDistrict("04")).toBe("Владислав Варненчик");
    expect(labelForDistrict("05")).toBe("Аспарухово");
  });
});

describe("normalizeWebsiteUrl", () => {
  it.each([
    ["dg13.bg", "https://dg13.bg"],
    ["http://ou-zs.bg/za-nas", "http://ou-zs.bg/za-nas"],
    ["HTTPS://OU-ZS.BG", "HTTPS://OU-ZS.BG"],
    ["www.dg13.bg/", "https://www.dg13.bg/"],
    ["  dg13.bg  ", "https://dg13.bg"],
  ])("accepts %s as %s", (value, expected) => {
    expect(normalizeWebsiteUrl(value)).toBe(expected);
  });

  it.each([
    ["javascript:alert(1)"],
    ["data:text/html,x"],
    ["mailto:a@b.bg"],
    ["ftp://files.example"],
    ["//evil.example"],
    ["not a url"],
    ["https://"],
    [""],
    ["   "],
  ])("treats %j as absent", (value) => {
    expect(normalizeWebsiteUrl(value)).toBeNull();
  });

  it("treats null as absent", () => {
    expect(normalizeWebsiteUrl(null)).toBeNull();
    expect(normalizeWebsiteUrl(undefined)).toBeNull();
  });
});

describe("freshness copy", () => {
  it("pins the stale banner text", () => {
    expect(STALE_BANNER_TEXT).toBe(
      "Данните са по-стари от 14 дни. Проверете и официалния източник преди кандидатстване.",
    );
  });

  it("formats dates day-first in Bulgarian", () => {
    expect(formatFreshnessDate(new Date("2026-09-15T13:05:33Z"))).toMatch(/^15\.09\.2026/);
  });
});
