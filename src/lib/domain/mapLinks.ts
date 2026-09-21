import type { InstitutionLocation } from "@/lib/api/client";

/* The backend's Location, not a local redeclaration — the shape is
   contractual. Aliased so callers that only have a coordinate (the manifest,
   a branch) read naturally. */
export type InstitutionLocationInput = InstitutionLocation;

export interface MapLink {
  id: "directions" | "google-maps" | "apple-maps" | "openstreetmap";
  label: string;
  href: string;
}

const COPY = {
  directions: "Как да стигна",
  googleMaps: "Google Карти",
  appleMaps: "Apple Карти",
  openStreetMap: "OpenStreetMap",
} as const;

/**
 * The four outbound map URLs for one building, directions first — the phone
 * routes from wherever the parent is, so we never ask for their location.
 *
 * Pure and map-library-free by design: the detail route renders these from
 * Astro frontmatter, where no MapLibre code may be imported, so they survive
 * with JavaScript disabled.
 */
export function buildMapLinks(location: InstitutionLocationInput, name: string): MapLink[] {
  /* Number#toString, not toFixed or toLocaleString: the coordinate goes out
     exactly as the backend sent it, and never with a decimal comma. */
  const lat = String(location.lat);
  const lon = String(location.lon);
  const pair = `${lat},${lon}`;

  return [
    {
      id: "directions",
      label: COPY.directions,
      href: `https://www.google.com/maps/dir/?api=1&destination=${pair}`,
    },
    {
      id: "google-maps",
      label: COPY.googleMaps,
      href: `https://www.google.com/maps/search/?api=1&query=${pair}`,
    },
    {
      id: "apple-maps",
      label: COPY.appleMaps,
      /* Real names carry quotes, № and Cyrillic; an unencoded " or # would
         truncate the URL at the fragment. */
      href: `https://maps.apple.com/?ll=${pair}&q=${encodeURIComponent(name)}`,
    },
    {
      id: "openstreetmap",
      label: COPY.openStreetMap,
      /* The hash follows the query string, and carries its own zoom prefix. */
      href: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`,
    },
  ];
}
