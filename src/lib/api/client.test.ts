import { afterEach, describe, expect, it, vi } from "vitest";

import {
  adaptStructuredMatchResponse,
  buildMatchRequestPath,
  matchAddress,
  type StructuredMatchResponse,
} from "./client";

describe("buildMatchRequestPath", () => {
  it("builds an unfiltered match path from address id", () => {
    expect(buildMatchRequestPath(123)).toBe("/api/match/v2?address_id=123");
  });

  it("does not include a kind filter in search requests", () => {
    expect(buildMatchRequestPath(123)).not.toContain("kind=");
  });
});

describe("adaptStructuredMatchResponse", () => {
  it("adapts the structured address context and result rows", () => {
    const response: StructuredMatchResponse = {
      address: {
        id: 123,
        district_code: "01",
        settlement: {
          code: "10135",
          name: "ГР.ВАРНА",
          locality_type: "city",
        },
      },
      results: [
        {
          id: 1,
          external_id: "1",
          name: "ДГ Тест",
          institution_kind: "kindergarten",
          reception_kind: "kindergarten",
          offering: "standard",
          source_url: "https://example.test/source",
          match_basis: "address",
          has_infant_group: false,
        },
      ],
    };

    expect(adaptStructuredMatchResponse(response)).toEqual(response);
  });
});

describe("matchAddress", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests structured match data from /api/match/v2", async () => {
    const response: StructuredMatchResponse = {
      address: {
        id: 123,
        district_code: "01",
        settlement: null,
      },
      results: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(matchAddress(123)).resolves.toEqual({
      ok: true,
      data: response,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/match/v2?address_id=123",
      { headers: { Accept: "application/json" } },
    );
  });

  it("keeps stale address ids retryable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "address_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(matchAddress(404)).resolves.toEqual({
      ok: false,
      error: {
        code: "address_not_found",
        message: "Адресът вече не е наличен в заредените данни.",
        status: 404,
      },
    });
  });
});
