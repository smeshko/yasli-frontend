import { describe, expect, it } from "vitest";

import { buildMatchRequestPath, normalizeMatchResponse, type MatchInstitution } from "./client";

describe("buildMatchRequestPath", () => {
  it("builds an unfiltered match path from address id", () => {
    expect(buildMatchRequestPath(123)).toBe("/api/match?address_id=123");
  });

  it("can include a kind filter when explicitly requested", () => {
    expect(buildMatchRequestPath(123, "kindergarten")).toBe(
      "/api/match?address_id=123&kind=kindergarten",
    );
  });

  it("leaves known-district match arrays unchanged", () => {
    const row: MatchInstitution = {
      id: 1,
      external_id: "1",
      name: "ДГ Тест",
      kind: "kindergarten",
      source_url: "https://example.test/source",
      match_type: "street",
      has_infant_group: false,
    };

    expect(normalizeMatchResponse([row])).toEqual({
      institutions: [row],
      districtUnknown: false,
    });
  });

  it("unwraps district-unknown match envelopes", () => {
    const row: MatchInstitution = {
      id: 1,
      external_id: "1",
      name: "ДГ Тест",
      kind: "kindergarten",
      source_url: "https://example.test/source",
      match_type: "street",
      has_infant_group: false,
    };

    expect(
      normalizeMatchResponse({
        match_type: "district_unknown",
        results: [row],
      }),
    ).toEqual({
      institutions: [row],
      districtUnknown: true,
    });
  });
});
