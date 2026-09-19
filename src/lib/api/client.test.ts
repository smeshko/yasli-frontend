import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildInstitutionBySourcePath,
  buildMatchRequestPath,
  getInstitutionBySource,
  matchAddress,
  type InstitutionProfile,
  type StructuredMatchResponse,
} from "./client";

describe("buildMatchRequestPath", () => {
  it("builds an unfiltered match path from address id", () => {
    expect(buildMatchRequestPath(123)).toBe("/api/match?address_id=123");
  });

  it("does not include a kind filter in search requests", () => {
    expect(buildMatchRequestPath(123)).not.toContain("kind=");
  });
});

describe("matchAddress", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests structured match data from /api/match", async () => {
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
      "http://localhost:8000/api/match?address_id=123",
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

describe("buildInstitutionBySourcePath", () => {
  it("builds the by-source path from kind and external id", () => {
    expect(buildInstitutionBySourcePath("kindergarten", "46")).toBe(
      "/api/institutions/by-source/kindergarten/46",
    );
    expect(buildInstitutionBySourcePath("nursery", "4")).toBe(
      "/api/institutions/by-source/nursery/4",
    );
  });

  it("percent-encodes an external id carrying a reserved character", () => {
    expect(buildInstitutionBySourcePath("preschool", "12/a?b")).toBe(
      "/api/institutions/by-source/preschool/12%2Fa%3Fb",
    );
  });
});

function profileResponse(): InstitutionProfile {
  return {
    id: 31,
    external_id: "46",
    name: 'ДГ№13 "Мир"',
    kind: "kindergarten",
    source_url: "https://example.test/46",
    last_seen_at: "2026-09-15T13:05:33Z",
    address: "гр. Варна",
    phone: "052 612 345",
    email: "a@b.bg",
    director: "Мария Иванова",
    website: null,
    district_code: "01",
    has_infant_group: false,
    location: null,
    branches: [],
    coverage: [],
  };
}

function stubFetch(response: Response | Error) {
  const fetchMock =
    response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("getInstitutionBySource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the profile on 200 and requests the by-source path", async () => {
    const profile = profileResponse();
    const fetchMock = stubFetch(jsonResponse(JSON.stringify(profile), 200));

    await expect(getInstitutionBySource("kindergarten", "46")).resolves.toEqual({
      ok: true,
      data: profile,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/institutions/by-source/kindergarten/46",
      { headers: { Accept: "application/json" } },
    );
  });

  it("maps a byte-exact institution_not_found 404 to its own code", async () => {
    stubFetch(jsonResponse(JSON.stringify({ error: "institution_not_found" }), 404));

    await expect(getInstitutionBySource("kindergarten", "35")).resolves.toEqual({
      ok: false,
      error: {
        code: "institution_not_found",
        message: "Институцията не е намерена в заредените данни.",
        status: 404,
      },
    });
  });

  it("degrades a 404 with any other body to http_error", async () => {
    stubFetch(jsonResponse(JSON.stringify({ detail: "Not Found" }), 404));

    const result = await getInstitutionBySource("kindergarten", "35");

    expect(result).toEqual({
      ok: false,
      error: { code: "http_error", message: "Сървърът върна грешка.", status: 404 },
    });
  });

  it("does not map an address_not_found body on the institution route", async () => {
    stubFetch(jsonResponse(JSON.stringify({ error: "address_not_found" }), 404));

    const result = await getInstitutionBySource("kindergarten", "35");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("address_not_found");
    }
  });

  it("maps a 500 to http_error", async () => {
    stubFetch(jsonResponse(JSON.stringify({ error: "internal_error" }), 500));

    await expect(getInstitutionBySource("kindergarten", "46")).resolves.toEqual({
      ok: false,
      error: { code: "http_error", message: "Сървърът върна грешка.", status: 500 },
    });
  });

  it("maps a thrown fetch to network_error", async () => {
    stubFetch(new TypeError("Failed to fetch"));

    await expect(getInstitutionBySource("kindergarten", "46")).resolves.toEqual({
      ok: false,
      error: { code: "network_error", message: "Заявката не беше изпратена." },
    });
  });

  it("maps an unparsable 200 to invalid_json", async () => {
    stubFetch(jsonResponse("{not json", 200));

    await expect(getInstitutionBySource("kindergarten", "46")).resolves.toEqual({
      ok: false,
      error: {
        code: "invalid_json",
        message: "Отговорът от сървъра не може да бъде прочетен.",
        status: 200,
      },
    });
  });
});
