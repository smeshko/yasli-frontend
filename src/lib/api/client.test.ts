import { describe, expect, it } from "vitest";

import { buildMatchRequestPath } from "./client";

describe("buildMatchRequestPath", () => {
  it("builds an unfiltered match path from address id", () => {
    expect(buildMatchRequestPath(123)).toBe("/api/match?address_id=123");
  });

  it("can include a kind filter when explicitly requested", () => {
    expect(buildMatchRequestPath(123, "kindergarten")).toBe(
      "/api/match?address_id=123&kind=kindergarten",
    );
  });
});
