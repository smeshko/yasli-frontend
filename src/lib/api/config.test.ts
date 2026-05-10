import { describe, expect, it } from "vitest";

import { resolveApiBaseUrl } from "./config";

describe("resolveApiBaseUrl", () => {
  it("normalizes an explicit API base URL", () => {
    expect(
      resolveApiBaseUrl({
        rawBaseUrl: "https://api.example.test/",
        isDevelopment: false,
      }),
    ).toBe("https://api.example.test");
  });

  it("uses the local default in development", () => {
    expect(resolveApiBaseUrl({ isDevelopment: true })).toBe("http://localhost:8000");
  });

  it("rejects missing production configuration", () => {
    expect(() => resolveApiBaseUrl({ isDevelopment: false })).toThrow(
      /PUBLIC_YASLI_API_BASE_URL/,
    );
  });

  it("rejects invalid production API URLs", () => {
    expect(() =>
      resolveApiBaseUrl({
        rawBaseUrl: "not-a-url",
        isDevelopment: false,
      }),
    ).toThrow(/PUBLIC_YASLI_API_BASE_URL/);
  });
});
