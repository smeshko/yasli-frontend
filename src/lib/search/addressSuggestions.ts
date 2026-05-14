import type { Address, Street } from "@/lib/api/client";
import { formatAddressNumber } from "@/lib/domain/address";

const CYRILLIC_OR_DIGIT_QUERY = /[\p{Script=Cyrillic}\d]/u;

const LATIN_DIGRAPHS: ReadonlyArray<readonly [RegExp, string]> = [
  [/sht/gi, "щ"],
  [/sh/gi, "ш"],
  [/ch/gi, "ч"],
  [/ts/gi, "ц"],
  [/zh/gi, "ж"],
  [/yu/gi, "ю"],
  [/ya/gi, "я"],
  [/yo/gi, "йо"],
];

const ABBREVIATION_EXPANSIONS: ReadonlyArray<readonly [string, string]> = [
  ["Н.Й.ВАПЦАРОВ", "НИКОЛА ЙОНКОВ ВАПЦАРОВ"],
  ["Г.М.ДИМИТРОВ", "ГЕОРГИ МИХОВ ДИМИТРОВ"],
  ["Н.ОБРЕШКОВ", "НИКОЛА ОБРЕШКОВ"],
  ["В.КОЛАРОВ", "ВАСИЛ КОЛАРОВ"],
  ["Н.НИКОЛАЕВИЧ", "НИКОЛАЙ НИКОЛАЕВИЧ"],
  ["Н.КОНСТАНТИНОВ", "НИКОЛА КОНСТАНТИНОВ"],
  ["Г.ПЕЦОВ", "ГЕОРГИ ГЕОРГИЕВ ПЕЦОВ"],
];

const LATIN_SINGLES: Record<string, string> = {
  a: "а",
  b: "б",
  c: "к",
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "х",
  i: "и",
  j: "й",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "к",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "в",
  x: "х",
  y: "й",
  z: "з",
};

export interface ExactAddressSuggestion {
  id: string;
  addressId: number;
  streetId: number;
  label: string;
  context: string;
  numberLabel: string;
  searchText: string;
}

export function buildExactAddressSuggestions(
  streets: Street[],
  addresses: Address[],
): ExactAddressSuggestion[] {
  const streetsById = new Map(streets.map((street) => [street.id, street]));

  return addresses
    .map((address) => {
      const street = streetsById.get(address.street_id);

      if (!street) {
        return null;
      }

      const streetLabel = formatStreetLabel(street);
      const numberLabel = formatAddressNumber(address);
      const unpaddedNumber = String(address.number_int);
      const label = `${streetLabel} ${numberLabel}`;
      const context = formatLocality(street.city);
      const searchableVariants = [
        label,
        `${streetLabel} ${unpaddedNumber}`,
        street.raw_name,
        street.street_part,
        street.type_marker ?? "",
        street.city,
        numberLabel,
        unpaddedNumber,
        ...expandAbbreviations(street.raw_name),
      ];

      return {
        id: String(address.id),
        addressId: address.id,
        streetId: street.id,
        label,
        context,
        numberLabel,
        searchText: normalizeSearchText(searchableVariants.join(" ")),
      } satisfies ExactAddressSuggestion;
    })
    .filter((suggestion): suggestion is ExactAddressSuggestion => suggestion !== null);
}

export function searchExactAddressSuggestions(
  suggestions: ExactAddressSuggestion[],
  query: string,
  limit = 8,
): ExactAddressSuggestion[] {
  const normalizedQuery = normalizeSearchText(transliterateLatin(query));

  if (!CYRILLIC_OR_DIGIT_QUERY.test(normalizedQuery) || normalizedQuery.length < 2) {
    return [];
  }

  const terms = normalizedQuery.split(" ").filter(Boolean);

  return suggestions
    .map((suggestion) => {
      const score = scoreSuggestion(suggestion, normalizedQuery, terms);
      return { suggestion, score };
    })
    .filter((item) => item.score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.suggestion.label.localeCompare(second.suggestion.label, "bg");
    })
    .slice(0, limit)
    .map((item) => item.suggestion);
}

function expandAbbreviations(rawName: string): string[] {
  return ABBREVIATION_EXPANSIONS.filter(([abbr]) => rawName.includes(abbr)).map(
    ([, expansion]) => expansion,
  );
}

export function transliterateLatin(value: string): string {
  let result = value;

  for (const [pattern, replacement] of LATIN_DIGRAPHS) {
    result = result.replace(pattern, replacement);
  }

  return result.replace(/[a-z]/gi, (letter) => {
    const replacement = LATIN_SINGLES[letter.toLowerCase()];
    return replacement ?? letter;
  });
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleUpperCase("bg-BG")
    .replace(/[^\p{Script=Cyrillic}\d]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatStreetLabel(street: Street): string {
  const typeMarker = street.type_marker ? street.type_marker.toLocaleLowerCase("bg-BG") : "";
  const streetPart = titleCaseBulgarian(street.street_part);

  if (typeMarker && streetPart) {
    return `${typeMarker} ${streetPart}`;
  }

  if (streetPart) {
    return streetPart;
  }

  return titleCaseBulgarian(street.raw_name);
}

export function formatLocality(value: string): string {
  return titleCaseBulgarian(value).replace(/^Гр\./, "гр.").replace(/^С\./, "с.");
}

function scoreSuggestion(
  suggestion: ExactAddressSuggestion,
  normalizedQuery: string,
  terms: string[],
): number {
  if (suggestion.searchText.startsWith(normalizedQuery)) {
    return 100 + normalizedQuery.length;
  }

  const words = suggestion.searchText.split(" ");

  if (terms.every((term) => words.some((word) => word.startsWith(term)))) {
    return 75 + terms.join("").length;
  }

  if (terms.every((term) => suggestion.searchText.includes(term))) {
    return 50 + terms.join("").length;
  }

  return 0;
}

function titleCaseBulgarian(value: string): string {
  return value
    .toLocaleLowerCase("bg-BG")
    .split(" ")
    .map((word) => {
      if (!word) {
        return word;
      }

      return `${word[0]?.toLocaleUpperCase("bg-BG") ?? ""}${word.slice(1)}`;
    })
    .join(" ");
}
