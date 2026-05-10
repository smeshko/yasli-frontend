import { apiBaseUrl } from "@/lib/api/config";
import type { components } from "@/lib/api/types";
import type { ReceptionKind } from "@/lib/domain/kinds";

export type Street = components["schemas"]["StreetOut"];
export type Address = components["schemas"]["AddressOut"];
export type MatchInstitution = components["schemas"]["MatchInstitution"];
export type InstitutionListItem = components["schemas"]["InstitutionListItem"];

export type ApiErrorCode =
  | "network_error"
  | "http_error"
  | "invalid_json"
  | "address_not_found";

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

export function buildMatchRequestPath(addressId: number, kind?: ReceptionKind): string {
  const params = new URLSearchParams({ address_id: String(addressId) });

  if (kind) {
    params.set("kind", kind);
  }

  return `/api/match?${params.toString()}`;
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

export function matchAddress(addressId: number): Promise<ApiResult<MatchInstitution[]>> {
  return requestJson<MatchInstitution[]>(buildMatchRequestPath(addressId));
}

async function requestJson<T>(path: string): Promise<ApiResult<T>> {
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
    const addressNotFound = await isAddressNotFoundResponse(response);

    if (addressNotFound) {
      return {
        ok: false,
        error: {
          code: "address_not_found",
          message: "Адресът вече не е наличен в заредените данни.",
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

async function isAddressNotFoundResponse(response: Response): Promise<boolean> {
  if (response.status !== 404) {
    return false;
  }

  try {
    const body = (await response.clone().json()) as { error?: string };
    return body.error === "address_not_found";
  } catch {
    return false;
  }
}
