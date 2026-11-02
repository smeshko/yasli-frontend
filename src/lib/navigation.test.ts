import { describe, expect, it } from "vitest";

import { buildNavItems } from "./navigation";

function activeLabels(pathname: string): string[] {
  return buildNavItems(pathname)
    .filter((item) => item.active)
    .map((item) => item.label);
}

describe("buildNavItems", () => {
  it("marks only the directory active on /institutions/ with or without the trailing slash", () => {
    expect(activeLabels("/institutions/")).toEqual(["Всички институции"]);
    expect(activeLabels("/institutions")).toEqual(["Всички институции"]);
  });

  it("marks only search active on /", () => {
    expect(activeLabels("/")).toEqual(["Търсене"]);
  });

  it("marks nothing on an institution page or /pravila", () => {
    expect(activeLabels("/institution/kindergarten-46/")).toEqual([]);
    expect(activeLabels("/pravila")).toEqual([]);
  });

  it("does not offer the admission rules page", () => {
    const items = buildNavItems("/");
    expect(items.map((item) => item.label)).not.toContain("Правила за прием");
    expect(items.map((item) => item.href)).not.toContain("/pravila");
  });
});
