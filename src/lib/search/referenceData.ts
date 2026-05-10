import {
  listAddresses,
  listStreets,
  type Address,
  type ApiRequestError,
  type Street,
} from "@/lib/api/client";
import {
  buildExactAddressSuggestions,
  type ExactAddressSuggestion,
} from "@/lib/search/addressSuggestions";

export interface ReferenceData {
  streets: Street[];
  addresses: Address[];
  suggestions: ExactAddressSuggestion[];
}

let referenceDataPromise: Promise<ReferenceData> | null = null;

export function loadReferenceData(): Promise<ReferenceData> {
  referenceDataPromise ??= fetchReferenceData();
  return referenceDataPromise;
}

export function clearReferenceDataCache(): void {
  referenceDataPromise = null;
}

async function fetchReferenceData(): Promise<ReferenceData> {
  const [streetsResult, addressesResult] = await Promise.all([listStreets(), listAddresses()]);

  if (!streetsResult.ok) {
    throw toReferenceDataError(streetsResult.error, "streets");
  }

  if (!addressesResult.ok) {
    throw toReferenceDataError(addressesResult.error, "addresses");
  }

  return {
    streets: streetsResult.data,
    addresses: addressesResult.data,
    suggestions: buildExactAddressSuggestions(streetsResult.data, addressesResult.data),
  };
}

function toReferenceDataError(error: ApiRequestError, source: "streets" | "addresses"): Error {
  return new Error(`${source}:${error.code}`);
}
