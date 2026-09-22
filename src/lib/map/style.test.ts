import { describe, expect, it } from "vitest";

import { bulgarianLabelStyle, styleUrlForTheme, type MapStyle } from "./style";

const BG_LABEL = ["coalesce", ["get", "name:bg"], ["get", "name"]];

/* Hand-built rather than a committed copy of the real 25 KB style: the point
   is to test the rewrite rule, not to snapshot OpenFreeMap's cartography,
   which would go stale silently. The four layers are the expression shapes
   measured against positron/dark on 2026-09-21 (RESEARCH.md fact 9). */
function fixtureStyle(): MapStyle {
  return {
    version: 8,
    layers: [
      {
        id: "place_label",
        type: "symbol",
        layout: {
          "text-size": 12,
          "text-field": [
            "case",
            ["has", "name:nonlatin"],
            ["concat", ["get", "name:latin"], " ", ["get", "name:nonlatin"]],
            ["coalesce", ["get", "name_en"], ["get", "name"]],
          ],
        },
      },
      {
        id: "water_name",
        type: "symbol",
        layout: {
          "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]],
        },
      },
      {
        /* A road shield number, not a name. Rewriting it blanks the motorway
           shields — the reason the rule is conditional at all. */
        id: "highway_name_motorway",
        type: "symbol",
        layout: {
          "text-field": ["to-string", ["get", "ref"]],
        },
      },
      { id: "background", type: "background" },
      { id: "water", type: "fill", layout: { visibility: "visible" } },
    ],
  };
}

describe("bulgarianLabelStyle", () => {
  it("rewrites only the layers whose text-field mentions name:latin", () => {
    const { style, rewritten } = bulgarianLabelStyle(fixtureStyle());

    expect(rewritten).toBe(2);
    expect(style.layers[0].layout?.["text-field"]).toEqual(BG_LABEL);
    expect(style.layers[1].layout?.["text-field"]).toEqual(BG_LABEL);
  });

  it("leaves a ref-based shield expression byte-identical", () => {
    const { style } = bulgarianLabelStyle(fixtureStyle());

    expect(style.layers[2].layout?.["text-field"]).toEqual(["to-string", ["get", "ref"]]);
  });

  it("leaves a layer with no layout, or a layout with no text-field, untouched", () => {
    const { style } = bulgarianLabelStyle(fixtureStyle());

    expect(style.layers[3]).toEqual({ id: "background", type: "background" });
    expect(style.layers[4].layout).toEqual({ visibility: "visible" });
  });

  it("keeps the other layout properties of a rewritten layer", () => {
    const { style } = bulgarianLabelStyle(fixtureStyle());

    expect(style.layers[0].layout?.["text-size"]).toBe(12);
  });

  it("does not mutate the style it was given", () => {
    const input = fixtureStyle();
    const before = structuredClone(input);

    bulgarianLabelStyle(input);

    expect(input).toEqual(before);
  });

  it("reports a rewrite count of zero when nothing matched", () => {
    const { rewritten } = bulgarianLabelStyle({
      version: 8,
      layers: [{ id: "shield", type: "symbol", layout: { "text-field": ["get", "ref"] } }],
    });

    /* Zero is the signal that OpenFreeMap changed its expression shapes and
       the labels are silently still Latin. */
    expect(rewritten).toBe(0);
  });

  it("survives a style with no layers at all", () => {
    expect(bulgarianLabelStyle({ version: 8, layers: [] })).toEqual({
      style: { version: 8, layers: [] },
      rewritten: 0,
    });
  });
});

describe("styleUrlForTheme", () => {
  /* Pinned as literals: changing the cartography must be a deliberate edit,
     not a side effect. positron/dark are the only matched OpenFreeMap pair. */
  it("uses positron under light and dark under dark", () => {
    expect(styleUrlForTheme("light")).toBe("https://tiles.openfreemap.org/styles/positron");
    expect(styleUrlForTheme("dark")).toBe("https://tiles.openfreemap.org/styles/dark");
  });

  it("keeps both styles on the same host, so the page touches one origin", () => {
    for (const theme of ["light", "dark"] as const) {
      expect(new URL(styleUrlForTheme(theme)).host).toBe("tiles.openfreemap.org");
      expect(new URL(styleUrlForTheme(theme)).search).toBe("");
    }
  });
});
