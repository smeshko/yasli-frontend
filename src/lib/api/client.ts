import { apiBaseUrl } from "@/lib/api/config";
import type { components, operations } from "@/lib/api/types";
import type { ReceptionKind } from "@/lib/domain/kinds";

export type Street = components["schemas"]["StreetOut"];
export type Address = components["schemas"]["AddressOut"];
export type MatchAddressContext = components["schemas"]["MatchAddressContext"];
export type MatchResult = components["schemas"]["MatchResult"];
export type StructuredMatchResponse =
  operations["match_api_match_get"]["responses"][200]["content"]["application/json"];
export type InstitutionListItem = components["schemas"]["InstitutionListItem"];
/* The enriched detail payload backend phase 1.3 added, shared by
   `GET /api/institutions/{institution_id}` and the by-source route. */
export type InstitutionProfile = components["schemas"]["InstitutionDetail"];
export type InstitutionBranch = components["schemas"]["Branch"];
export type InstitutionLocation = components["schemas"]["Location"];
export type CoverageGroup = components["schemas"]["CoverageGroup"];

export type MatchData = StructuredMatchResponse;

export type ApiErrorCode =
  | "network_error"
  | "http_error"
  | "invalid_json"
  | "address_not_found"
  | "institution_not_found";

export interface ApiRequestError {
  code: ApiErrorCode;
  message: string;
  status?: number;
}

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiRequestError;
    };

export function buildMatchRequestPath(addressId: number): string {
  const params = new URLSearchParams({ address_id: String(addressId) });

  return `/api/match?${params.toString()}`;
}

export function buildInstitutionBySourcePath(kind: ReceptionKind, externalId: string): string {
  return `/api/institutions/by-source/${kind}/${encodeURIComponent(externalId)}`;
}

export function listStreets(): Promise<ApiResult<Street[]>> {
  return requestJson<Street[]>("/api/streets");
}

export function listAddresses(): Promise<ApiResult<Address[]>> {
  return requestJson<Address[]>("/api/addresses");
}

export function listInstitutions(): Promise<ApiResult<InstitutionListItem[]>> {
  return requestJson<InstitutionListItem[]>("/api/institutions");
}

export async function matchAddress(addressId: number): Promise<ApiResult<MatchData>> {
  return requestJson<MatchData>(buildMatchRequestPath(addressId));
}

export function getInstitutionBySource(
  kind: ReceptionKind,
  externalId: string,
): Promise<ApiResult<InstitutionProfile>> {
  /* A 404 here with no recognised `error` code means "no profile at this
     slug". The backend's own miss is `{"error":"institution_not_found"}`, but
     a backend deployed before phase 1.3 has no `by-source` route at all and
     answers FastAPI's `{"detail":"Not Found"}`. Without the fallback that
     lands in the error state, whose retry can never succeed; the not-found
     state at least says what happened and offers a way back.

     A body that does carry a recognised code is still taken at its word — see
     readNotFoundCode — so the other route's code would pass through here. The
     backend never sends it on this route. */
  return requestJson<InstitutionProfile>(buildInstitutionBySourcePath(kind, externalId), {
    notFoundFallback: "institution_not_found",
  });
}

interface RequestOptions {
  /* Applied only when a 404 body carries no recognised `error` code. */
  notFoundFallback?: NotFoundCode;
}

async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    return {
      ok: false,
      error: {
        code: "network_error",
        message: "Заявката не беше изпратена.",
      },
    };
  }

  if (!response.ok) {
    const notFoundCode =
      (await readNotFoundCode(response)) ??
      (response.status === 404 ? (options.notFoundFallback ?? null) : null);

    if (notFoundCode) {
      return {
        ok: false,
        error: {
          code: notFoundCode,
          message: NOT_FOUND_MESSAGES[notFoundCode],
          status: response.status,
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "http_error",
        message: "Сървърът върна грешка.",
        status: response.status,
      },
    };
  }

  try {
    return {
      ok: true,
      data: (await response.json()) as T,
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "invalid_json",
        message: "Отговорът от сървъра не може да бъде прочетен.",
        status: response.status,
      },
    };
  }
}

/* A closed list, not any `error` string: both backend 404s are byte-exact
   bodies (`routes/institutions.py:176` for the institution routes, the match
   route for the address one), and trusting an arbitrary `error` value would
   turn an unrelated 404 into a state the UI treats as authoritative. */
type NotFoundCode = "address_not_found" | "institution_not_found";

const NOT_FOUND_MESSAGES: Record<NotFoundCode, string> = {
  address_not_found: "Адресът вече не е наличен в заредените данни.",
  institution_not_found: "Институцията не е намерена в заредените данни.",
};

async function readNotFoundCode(response: Response): Promise<NotFoundCode | null> {
  if (response.status !== 404) {
    return null;
  }

  try {
    const body = (await response.clone().json()) as { error?: string };

    if (body.error === "address_not_found" || body.error === "institution_not_found") {
      return body.error;
    }

    return null;
  } catch {
    return null;
  }
}
