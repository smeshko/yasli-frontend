import { describe, expect, it } from "vitest";

import { buildMapLinks, type InstitutionLocationInput } from "./mapLinks";

/* The real ДГ№13 „Мир“ main building, from institution_locations.csv. */
const mir: InstitutionLocationInput = { lat: 43.209589, lon: 27.926883, precision: "building" };
const mirName = 'ДГ№13 "Мир"';

function hrefOf(id: string, location = mir, name = mirName): string {
  const link = buildMapLinks(location, name).find((candidate) => candidate.id === id);
  if (!link) {
    throw new Error(`no link with id "${id}"`);
  }
  return link.href;
}

describe("buildMapLinks", () => {
  it("puts directions first — it is the primary affordance", () => {
    const links = buildMapLinks(mir, mirName);

    expect(links.map((link) => link.id)).toEqual([
      "directions",
      "google-maps",
      "apple-maps",
      "openstreetmap",
    ]);
    expect(links[0].label).toBe("Как да стигна");
  });

  it("builds the Google Maps directions URL", () => {
    expect(hrefOf("directions")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=43.209589,27.926883",
    );
  });

  it("builds the Google Maps search URL", () => {
    expect(hrefOf("google-maps")).toBe(
      "https://www.google.com/maps/search/?api=1&query=43.209589,27.926883",
    );
  });

  it("builds the Apple Maps URL with the name as the query", () => {
    expect(hrefOf("apple-maps")).toBe(
      "https://maps.apple.com/?ll=43.209589,27.926883&q=%D0%94%D0%93%E2%84%9613%20%22%D0%9C%D0%B8%D1%80%22",
    );
  });

  it("builds the OpenStreetMap URL with the marker query and the zoom-18 hash", () => {
    expect(hrefOf("openstreetmap")).toBe(
      "https://www.openstreetmap.org/?mlat=43.209589&mlon=27.926883#map=18/43.209589/27.926883",
    );
  });

  it("percent-encodes quotes, № and Cyrillic in the Apple Maps name", () => {
    const href = hrefOf("apple-maps", mir, 'ДГ№13 "Мир" & #1');

    expect(href).not.toContain('"');
    expect(href).not.toContain("#");
    expect(href).toContain("%22");
    expect(href).toContain("%26");
    expect(href).toContain("%231");
  });

  it("formats the coordinate as given, without rounding or a locale separator", () => {
    const href = hrefOf("directions", { lat: -1.000001, lon: 100.5, precision: "approximate" });

    expect(href).toBe("https://www.google.com/maps/dir/?api=1&destination=-1.000001,100.5");
  });

  it("labels every link in Bulgarian", () => {
    expect(buildMapLinks(mir, mirName).map((link) => link.label)).toEqual([
      "Как да стигна",
      "Google Карти",
      "Apple Карти",
      "OpenStreetMap",
    ]);
  });
});
