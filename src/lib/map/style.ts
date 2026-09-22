/* A minimal local shape rather than MapLibre's StyleSpecification. This module
   must stay loadable in the node test environment — vitest runs with no DOM,
   no canvas and no WebGL — and importing anything from `maplibre-gl`, even a
   type, drags its module graph into the test run and into any chunk that
   touches this file. The map island casts on the way in. */
export interface MapStyleLayer {
  id: string;
  type: string;
  layout?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MapStyle {
  version: number;
  layers: MapStyleLayer[];
  [key: string]: unknown;
}

export type MapTheme = "light" | "dark";

export interface BulgarianLabelResult {
  style: MapStyle;
  /** How many layers were rewritten — zero means the rule matched nothing. */
  rewritten: number;
}

/* positron and dark are the only matched OpenFreeMap pair: the same layer set
   in two palettes, so a theme swap reads as one map changing stock. Neither
   needs a key, a quota or a registration. */
const STYLE_URLS: Record<MapTheme, string> = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const BULGARIAN_TEXT_FIELD = ["coalesce", ["get", "name:bg"], ["get", "name"]];

export function styleUrlForTheme(theme: MapTheme): string {
  return STYLE_URLS[theme];
}

/**
 * Prefer the Bulgarian name on every base-map label.
 *
 * OpenFreeMap's label layers render `name:latin` (plus `name:nonlatin`), which
 * on a Bulgarian-only site is Latin transliteration — a defect. The rewrite is
 * conditional rather than blanket because not every `text-field` is a name:
 * `highway_name_motorway` reads `["to-string", ["get","ref"]]`, and replacing
 * that blanks the motorway shields.
 *
 * The test for "is this a name" is whether the expression mentions
 * `name:latin` anywhere, walked as a tree — the three expression shapes
 * measured today are not a contract, but the field name is.
 *
 * Returns a new style; the argument is never mutated, because MapLibre hands
 * back the style object it is still using.
 */
export function bulgarianLabelStyle(style: MapStyle): BulgarianLabelResult {
  let rewritten = 0;

  const layers = style.layers.map((layer) => {
    const textField = layer.layout?.["text-field"];
    if (textField === undefined || !mentionsLatinName(textField)) {
      return layer;
    }

    rewritten += 1;
    return {
      ...layer,
      layout: { ...layer.layout, "text-field": structuredClone(BULGARIAN_TEXT_FIELD) },
    };
  });

  return { style: { ...style, layers }, rewritten };
}

function mentionsLatinName(expression: unknown): boolean {
  if (typeof expression === "string") {
    return expression === "name:latin";
  }

  if (Array.isArray(expression)) {
    return expression.some(mentionsLatinName);
  }

  return false;
}
