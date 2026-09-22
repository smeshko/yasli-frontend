import { describe, expect, it } from "vitest";

import { buildDirectionsLink, type InstitutionLocationInput } from "./directionsLink";

/* The real ДГ№13 „Мир“ main building, from institution_locations.csv. */
const mir: InstitutionLocationInput = { lat: 43.209589, lon: 27.926883, precision: "building" };

describe("buildDirectionsLink", () => {
  it("builds the Google Maps directions URL", () => {
    expect(buildDirectionsLink(mir).href).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=43.209589,27.926883",
    );
  });

  it("labels the link in Bulgarian", () => {
    expect(buildDirectionsLink(mir).label).toBe("Как да стигна");
  });

  it("formats the coordinate as given, without rounding or a locale separator", () => {
    const href = buildDirectionsLink({ lat: -1.000001, lon: 100.5, precision: "approximate" }).href;

    expect(href).toBe("https://www.google.com/maps/dir/?api=1&destination=-1.000001,100.5");
  });
});
