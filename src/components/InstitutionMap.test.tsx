import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { InstitutionBranch, InstitutionLocation } from "@/lib/api/client";

import { InstitutionMap } from "./InstitutionMap";

/* The suite runs in a node environment: no DOM, no canvas, no WebGL, and
   effects never run under renderToStaticMarkup. So what is asserted here is
   exactly what the server emits and what the first client render must agree
   with — everything the map actually does is covered by the pure helpers in
   src/lib/map/ and by TASK-007's runtime evidence. */
const location: InstitutionLocation = { lat: 43.209589, lon: 27.926883, precision: "building" };

function render(props: { location: InstitutionLocation | null; branches?: InstitutionBranch[] }) {
  return renderToStaticMarkup(
    <InstitutionMap location={props.location} branches={props.branches ?? []} name='ДГ№13 "Мир"' />,
  );
}

describe("InstitutionMap", () => {
  it("renders nothing at all without a coordinate", () => {
    expect(render({ location: null })).toBe("");
  });

  it("renders nothing when the only coordinates are on branches", () => {
    const branches = [
      { label: "филиал", address: "ул. Тест 1", location } as InstitutionBranch,
    ];

    expect(render({ location: null, branches })).toBe("");
  });

  it("renders a labelled region with an empty container when it has a coordinate", () => {
    const markup = render({ location });

    expect(markup).toContain('class="profile-map"');
    expect(markup).toContain('aria-label="Карта на сградите"');
    expect(markup).toContain('class="profile-map-canvas"');
  });

  it("emits no map code and no pins on the server — the effect draws them", () => {
    const markup = render({ location });

    expect(markup).not.toContain("maplibre");
    expect(markup).not.toContain("<canvas");
    expect(markup).not.toContain("profile-map-pin");
  });

  it("gives the region no focusable children, so it can never trap focus", () => {
    const markup = render({ location });

    expect(markup).not.toContain("tabindex");
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("<a ");
  });

  it("renders the same markup with and without branches — pins arrive in the effect", () => {
    const branches = [
      { label: "филиал", address: "ул. Тест 1", location } as InstitutionBranch,
    ];

    expect(render({ location, branches })).toBe(render({ location }));
  });
});
