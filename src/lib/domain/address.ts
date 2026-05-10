export interface AddressNumberParts {
  number_int: number;
  number_suffix?: string | null;
  entrance?: string | null;
}

export function formatAddressNumber(parts: AddressNumberParts): string {
  const number = String(parts.number_int).padStart(3, "0");
  const suffix = parts.number_suffix?.trim() ?? "";
  const entrance = parts.entrance?.trim();

  return entrance ? `${number}${suffix} вх.${entrance}` : `${number}${suffix}`;
}
