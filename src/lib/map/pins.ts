import type { InstitutionBranch, InstitutionLocation } from "@/lib/api/client";

export interface MapPin {
  kind: "main" | "branch";
  lat: number;
  lon: number;
}

/** MapLibre's order: [lon, lat]. */
export type LngLat = [number, number];

export type MapView =
  | { mode: "bounds"; bounds: [LngLat, LngLat] }
  /* One point has no extent to fit, so it gets a fixed zoom instead. */
  | { mode: "center"; center: LngLat };

/**
 * The buildings to draw: the institution itself, then each branch that the
 * backend has a coordinate for.
 *
 * A branch without one is simply not pinned. Its label and address are already
 * on the page in the "Филиали" list, and inferring a position for it would
 * have the map claim something the data does not say.
 */
export function toPins(
  location: InstitutionLocation | null,
  branches: readonly InstitutionBranch[],
): MapPin[] {
  if (!location) {
    return [];
  }

  const pins: MapPin[] = [{ kind: "main", lat: location.lat, lon: location.lon }];

  for (const branch of branches) {
    if (branch.location) {
      pins.push({ kind: "branch", lat: branch.location.lat, lon: branch.location.lon });
    }
  }

  return pins;
}

export function fitBoundsFor(pins: readonly MapPin[]): MapView | null {
  if (pins.length === 0) {
    return null;
  }

  if (pins.length === 1) {
    return { mode: "center", center: [pins[0].lon, pins[0].lat] };
  }

  const lons = pins.map((pin) => pin.lon);
  const lats = pins.map((pin) => pin.lat);

  return {
    mode: "bounds",
    bounds: [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ],
  };
}
