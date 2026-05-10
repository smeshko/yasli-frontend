const LOCAL_API_BASE_URL = "http://localhost:8000";
const API_BASE_URL_ENV = "PUBLIC_YASLI_API_BASE_URL";

export interface ApiBaseUrlOptions {
  rawBaseUrl?: string;
  isDevelopment: boolean;
}

export function resolveApiBaseUrl({ rawBaseUrl, isDevelopment }: ApiBaseUrlOptions): string {
  const value = rawBaseUrl?.trim();

  if (!value) {
    if (isDevelopment) {
      return LOCAL_API_BASE_URL;
    }

    throw new Error(`${API_BASE_URL_ENV} is required outside local development.`);
  }

  return normalizeApiBaseUrl(value);
}

function normalizeApiBaseUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${API_BASE_URL_ENV} must be an absolute URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${API_BASE_URL_ENV} must use http or https.`);
  }

  return value.replace(/\/+$/, "");
}

export const apiBaseUrl = resolveApiBaseUrl({
  rawBaseUrl: import.meta.env.PUBLIC_YASLI_API_BASE_URL,
  isDevelopment: import.meta.env.DEV,
});
