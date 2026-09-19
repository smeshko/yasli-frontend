import { describe, expect, it } from "vitest";

import { formatAddressNumber } from "./address";
import { DISTRICT_NAMES, labelForDistrict } from "./districts";
import {
  STALE_BANNER_TEXT,
  formatFreshnessDate,
  isSnapshotStale,
  parseFreshnessDate,
} from "./freshness";
import { parseInstitutionNumber } from "./institutionName";
import { labelForReceptionKind, receptionKindLabels, receptionKindOrder } from "./kinds";
import { normalizeExternalUrl, normalizeWebsiteUrl } from "./website";

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

describe("parseFreshnessDate", () => {
  it("parses a valid timestamp", () => {
    expect(parseFreshnessDate("2026-08-20T09:00:00Z")?.toISOString()).toBe(
      "2026-08-20T09:00:00.000Z",
    );
  });

  /* `last_seen_at` is typed as a bare string. Every unparsable shape has to
     come back as null rather than throwing, because the caller is on the
     render path of an island with no error boundary above it. */
  it("returns null for anything unparsable", () => {
    expect(parseFreshnessDate("not-a-date")).toBeNull();
    expect(parseFreshnessDate("")).toBeNull();
    expect(parseFreshnessDate(null)).toBeNull();
    expect(parseFreshnessDate(undefined)).toBeNull();
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

  /* The code union is compile-time only, over a generated file. A sixth code
     from the backend used to render the literal "район undefined." */
  it("returns null for a code it does not know", () => {
    expect(labelForDistrict("06")).toBeNull();
    expect(labelForDistrict("")).toBeNull();
    expect(labelForDistrict(null)).toBeNull();
    expect(labelForDistrict("toString")).toBeNull();
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

describe("normalizeExternalUrl", () => {
  it("keeps an absolute http(s) url", () => {
    expect(normalizeExternalUrl("https://dg.uslugi.io/lv/46.html")).toBe(
      "https://dg.uslugi.io/lv/46.html",
    );
    expect(normalizeExternalUrl("http://example.bg")).toBe("http://example.bg");
  });

  /* Stricter than normalizeWebsiteUrl on purpose: source_url is built by the
     backend, so a value without a scheme is a data fault. Completing it into
     some origin would turn a broken record into a confident outbound link. */
  it("rejects anything that does not declare http(s) itself", () => {
    expect(normalizeExternalUrl("dg.uslugi.io/46.html")).toBeNull();
    expect(normalizeExternalUrl("/lv/documents/46.html")).toBeNull();
    expect(normalizeExternalUrl("//dg.uslugi.io/46.html")).toBeNull();
    expect(normalizeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeExternalUrl("data:text/html,<script>")).toBeNull();
    expect(normalizeExternalUrl("ftp://example.bg")).toBeNull();
    expect(normalizeExternalUrl("https://")).toBeNull();
    expect(normalizeExternalUrl("")).toBeNull();
    expect(normalizeExternalUrl(null)).toBeNull();
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
