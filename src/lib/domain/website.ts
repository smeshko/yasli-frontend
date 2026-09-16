const HTTP_SCHEME = /^https?:\/\//i;
/* Anything shaped like `scheme:` — javascript:, data:, mailto:, ftp:… A bare
   host with a port (`host:8080`) also matches and is rejected; scraped
   website values never carry one, and rejecting is the safe side. */
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Turns a scraped `website` value into an absolute `http:`/`https:` URL, or
 * `null` when it must not become an `href`. The source field is an arbitrary
 * string, so nothing reaches a link unchecked: only http(s) schemes survive,
 * a bare host gets `https://` prefixed, and the result has to parse with a
 * non-empty hostname.
 */
export function normalizeWebsiteUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";

  if (trimmed === "" || trimmed.startsWith("//")) {
    return null;
  }

  let candidate: string;

  if (HTTP_SCHEME.test(trimmed)) {
    candidate = trimmed;
  } else if (ANY_SCHEME.test(trimmed)) {
    return null;
  } else {
    candidate = `https://${trimmed}`;
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.hostname === "") {
    return null;
  }

  return candidate;
}
