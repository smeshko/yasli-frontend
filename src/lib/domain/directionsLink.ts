import type { InstitutionLocation } from "@/lib/api/client";

/* The backend's Location, not a local redeclaration — the shape is
   contractual. Aliased so callers that only have a coordinate (the manifest,
   a branch) read naturally. */
export type InstitutionLocationInput = InstitutionLocation;

export interface MapLink {
  id: "directions";
  label: string;
  href: string;
}

const DIRECTIONS_LABEL = "Как да стигна";

/**
 * The one outbound map URL for a building: directions — the phone routes from
 * wherever the parent is, so we never ask for their location.
 *
 * Pure and map-library-free by design: the detail route renders it from Astro
 * frontmatter, where no MapLibre code may be imported, so it survives with
 * JavaScript disabled.
 */
export function buildDirectionsLink(location: InstitutionLocationInput): MapLink {
  /* Number#toString, not toFixed or toLocaleString: the coordinate goes out
     exactly as the backend sent it, and never with a decimal comma. */
  const pair = `${String(location.lat)},${String(location.lon)}`;

  return {
    id: "directions",
    label: DIRECTIONS_LABEL,
    href: `https://www.google.com/maps/dir/?api=1&destination=${pair}`,
  };
}
