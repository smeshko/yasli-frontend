import { describe, expect, it } from "vitest";

import { splitEmail, splitPhone } from "./contacts";

describe("splitPhone", () => {
  /* The five shapes pinned in scraper/tests/test_source.py, which the scraper
     deliberately passes through with every separator intact. */
  it.each([
    ["052/613039", "052613039"],
    ["052/613039 0885 123 456", "052613039"],
    ["0885/665-940 052/820-764", "0885665940"],
    ["052/613039 / 052/613040", "052613039"],
    ["052 820758 0885665404", "052820758"],
  ])("links only the first number in %s", (raw, dial) => {
    expect(splitPhone(raw).dial).toBe(dial);
  });

  /* The verbatim live TEL for ДЯ № 4 (DZ_ID 4 → nursery/4, a real page).
     Stripping whitespace produced tel:0528207580885665404 — 19 digits. */
  it("does not concatenate ДЯ № 4's two numbers into one href", () => {
    const { dial, display } = splitPhone("052 820758 0885665404");

    expect(dial).toBe("052820758");
    expect(dial).not.toBe("0528207580885665404");
    expect(display).toBe("052 820758 0885665404");
  });

  it("keeps the whole published value as the text", () => {
    expect(splitPhone("052/613039 / 052/613040").display).toBe("052/613039 / 052/613040");
  });

  it("keeps a +359 number dialable", () => {
    expect(splitPhone("+359 52 613039").dial).toBe("+35952613039");
  });

  /* Never a partial href: a value with nothing number-shaped in it renders as
     text, not as a tel: link to whatever digits happened to be there. */
  it("returns no dial value when nothing parses as a number", () => {
    expect(splitPhone("няма").dial).toBeNull();
    expect(splitPhone("052").dial).toBeNull();
    expect(splitPhone("—").dial).toBeNull();
  });
});

describe("splitEmail", () => {
  it("links a single address", () => {
    expect(splitEmail("dg13mir@example.bg")).toEqual({
      address: "dg13mir@example.bg",
      display: "dg13mir@example.bg",
    });
  });

  it.each([
    "dg13mir@example.bg, dg13@example.bg",
    "dg13mir@example.bg; dg13@example.bg",
    "dg13mir@example.bg / dg13@example.bg",
  ])("takes only the first address from %s", (raw) => {
    expect(splitEmail(raw).address).toBe("dg13mir@example.bg");
  });

  it("keeps the whole published value as the text", () => {
    expect(splitEmail("a@b.bg, c@d.bg").display).toBe("a@b.bg, c@d.bg");
  });

  it("returns no address when nothing parses", () => {
    expect(splitEmail("няма имейл").address).toBeNull();
  });
});
