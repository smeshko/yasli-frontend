import { describe, expect, it } from "vitest";

import type { Address, Street } from "@/lib/api/client";

import {
  buildExactAddressSuggestions,
  formatLocality,
  formatStreetLabel,
  isSearchableQuery,
  normalizeSearchText,
  searchExactAddressSuggestions,
} from "./addressSuggestions";

const streets: Street[] = [
  {
    id: 10,
    city: "ГР.ВАРНА",
    raw_name: "ГР.ВАРНА БУЛ.ГЕНЕРАЛ КОЛЕВ",
    street_part: "ГЕНЕРАЛ КОЛЕВ",
    type_marker: "БУЛ.",
  },
  {
    id: 11,
    city: "С. ТОПОЛИ",
    raw_name: "С. ТОПОЛИ УЛ.ГЕНЕРАЛ КОЛЕВ",
    street_part: "ГЕНЕРАЛ КОЛЕВ",
    type_marker: "УЛ.",
  },
  {
    id: 12,
    city: "ГР.ВАРНА",
    raw_name: "ГР.ВАРНА УЛ.НИКОЛА ВАПЦАРОВ",
    street_part: "НИКОЛА ВАПЦАРОВ",
    type_marker: "УЛ.",
  },
  {
    id: 13,
    city: "ГР.ВАРНА",
    raw_name: "ГР.ВАРНА УЛ.Н.Й.ВАПЦАРОВ",
    street_part: "Н.Й.ВАПЦАРОВ",
    type_marker: "УЛ.",
  },
  {
    id: 15,
    city: "ГР.ВАРНА",
    raw_name: "ГР.ВАРНА УЛ.ПРЕСЛАВ",
    street_part: "ПРЕСЛАВ",
    type_marker: "УЛ.",
  },
  {
    id: 14,
    city: "С. ТОПОЛИ",
    raw_name: "С. ТОПОЛИ БАРАКИ КДД В.КОЛАРОВ",
    street_part: "",
    type_marker: null,
  },
];

describe("buildExactAddressSuggestions", () => {
  it("formats indexed addresses with suffix and entrance", () => {
    const suggestions = buildExactAddressSuggestions(streets, [
      {
        id: 101,
        street_id: 10,
        number_int: 2,
        number_suffix: "А",
        entrance: "01",
      },
    ]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.label).toContain("002А вх.01");
    expect(suggestions[0]?.addressId).toBe(101);
    expect(suggestions[0]?.context).toBe("гр. Варна");
  });

  it("keeps distinct suffix and entrance rows separate", () => {
    const addresses: Address[] = [
      {
        id: 201,
        street_id: 10,
        number_int: 85,
        number_suffix: null,
        entrance: null,
      },
      {
        id: 202,
        street_id: 10,
        number_int: 85,
        number_suffix: "А",
        entrance: null,
      },
      {
        id: 203,
        street_id: 10,
        number_int: 85,
        number_suffix: null,
        entrance: "01",
      },
    ];

    const suggestions = buildExactAddressSuggestions(streets, addresses);

    expect(suggestions.map((suggestion) => suggestion.addressId)).toEqual([201, 202, 203]);
    expect(new Set(suggestions.map((suggestion) => suggestion.label)).size).toBe(3);
  });
});

describe("formatLocality", () => {
  it.each([
    ["ГР.ВАРНА", "гр. Варна"],
    ["С.КАМЕНАР", "с. Каменар"],
    ["С. КАМЕНАР", "с. Каменар"],
    ["ВАРНА", "Варна"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatLocality(input)).toBe(expected);
  });
});

describe("formatStreetLabel", () => {
  const base = { id: 1, city: "ГР.ВАРНА", street_part: "", type_marker: null };

  it("splits the marker off a raw-name label", () => {
    expect(formatStreetLabel({ ...base, raw_name: "ГР.ВАРНА КК ЧАЙКА 033" })).toBe(
      "гр. Варна Кк Чайка 033",
    );
  });

  it("lowercases the village marker of a raw-name label", () => {
    expect(
      formatStreetLabel({ ...base, raw_name: "С.ЗВЕЗДИЦА МЕСТН.ЕКШЕЛМА (ПОД СЕЛОТО) 031" }).startsWith(
        "с. Звездица ",
      ),
    ).toBe(true);
  });

  it("formats the raw-name-only fixture street", () => {
    const street = streets.find((s) => s.id === 14) as Street;

    expect(formatStreetLabel(street)).toBe("с. Тополи Бараки Кдд В.коларов");
  });

  it("keeps a typed street as marker plus street part", () => {
    expect(formatStreetLabel(streets[0] as Street)).toBe("бул. Генерал Колев");
  });
});

describe("searchExactAddressSuggestions", () => {
  it("matches Cyrillic street and unpadded number input", () => {
    const suggestions = buildExactAddressSuggestions(streets, [
      {
        id: 301,
        street_id: 10,
        number_int: 85,
        number_suffix: null,
        entrance: null,
      },
    ]);

    expect(searchExactAddressSuggestions(suggestions, "бул. Генерал Колев 85")).toHaveLength(1);
    expect(searchExactAddressSuggestions(suggestions, "генерал 85")[0]?.addressId).toBe(301);
  });

  it("transliterates Latin input to Cyrillic before matching", () => {
    const suggestions = buildExactAddressSuggestions(streets, [
      {
        id: 401,
        street_id: 10,
        number_int: 85,
        number_suffix: null,
        entrance: null,
      },
    ]);

    expect(searchExactAddressSuggestions(suggestions, "General Kolev 85")[0]?.addressId).toBe(401);
  });

  it("matches a street whose street_part contains the typed prefix", () => {
    const suggestions = buildExactAddressSuggestions(streets, [
      {
        id: 501,
        street_id: 12,
        number_int: 12,
        number_suffix: null,
        entrance: null,
      },
    ]);

    const results = searchExactAddressSuggestions(suggestions, "никола вапца");

    expect(results[0]?.addressId).toBe(501);
  });

  it("expands stored initials so the full first name matches", () => {
    const suggestions = buildExactAddressSuggestions(streets, [
      {
        id: 601,
        street_id: 13,
        number_int: 10,
        number_suffix: null,
        entrance: null,
      },
      {
        id: 602,
        street_id: 14,
        number_int: 3,
        number_suffix: null,
        entrance: null,
      },
    ]);

    expect(searchExactAddressSuggestions(suggestions, "никола вапцаров")[0]?.addressId).toBe(601);
    expect(searchExactAddressSuggestions(suggestions, "васил коларов")[0]?.addressId).toBe(602);
  });
});

describe("normalizeSearchText", () => {
  it("splits a street name from its number but keeps a number's suffix", () => {
    expect(normalizeSearchText("преслав12")).toBe("ПРЕСЛАВ 12");
    expect(normalizeSearchText("преслав2а")).toBe("ПРЕСЛАВ 2А");
    expect(normalizeSearchText("002А")).toBe("002А");
  });
});

describe("letter/digit joins in search", () => {
  const preslav = buildExactAddressSuggestions(streets, [
    { id: 701, street_id: 15, number_int: 12, number_suffix: null, entrance: null },
  ]);

  it("matches a street name joined to its number", () => {
    expect(searchExactAddressSuggestions(preslav, "преслав12").map((s) => s.addressId)).toContain(
      701,
    );
  });

  it("matches a pasted two-line address once the line break is stripped", () => {
    const stripped = "преслав\n12".replace(/[\r\n]/g, "");

    expect(searchExactAddressSuggestions(preslav, stripped).map((s) => s.addressId)).toContain(701);
    expect(searchExactAddressSuggestions(preslav, "преслав\n12").map((s) => s.addressId)).toContain(
      701,
    );
  });

  it("matches suffixed numbers with and without padding", () => {
    const suffixed = buildExactAddressSuggestions(streets, [
      { id: 801, street_id: 10, number_int: 2, number_suffix: "А", entrance: null },
    ]);

    expect(searchExactAddressSuggestions(suffixed, "2а").map((s) => s.addressId)).toContain(801);
    expect(searchExactAddressSuggestions(suffixed, "002А").map((s) => s.addressId)).toContain(801);
  });

  it("ranks a suffixed number first among unsuffixed neighbours", () => {
    const neighbours = buildExactAddressSuggestions(streets, [
      { id: 901, street_id: 15, number_int: 2, number_suffix: null, entrance: null },
      { id: 902, street_id: 15, number_int: 2, number_suffix: "А", entrance: null },
      { id: 903, street_id: 15, number_int: 2, number_suffix: "В", entrance: null },
      { id: 904, street_id: 10, number_int: 2, number_suffix: null, entrance: null },
      { id: 905, street_id: 12, number_int: 20, number_suffix: null, entrance: null },
      { id: 906, street_id: 13, number_int: 200, number_suffix: null, entrance: null },
    ]);

    expect(searchExactAddressSuggestions(neighbours, "2в").map((s) => s.addressId)).toEqual([903]);
    expect(searchExactAddressSuggestions(neighbours, "002В")[0]?.addressId).toBe(903);
    expect(searchExactAddressSuggestions(neighbours, "преслав 2в")[0]?.addressId).toBe(903);
  });
});

describe("isSearchableQuery", () => {
  it.each([
    ["empty", ""],
    ["a single Cyrillic letter", "а"],
    ["a single Latin letter", "a"],
    ["a single digit", "1"],
    ["punctuation only", "!!!"],
    ["a single letter with surrounding spaces", "  а  "],
  ])("rejects %s", (_name, query) => {
    expect(isSearchableQuery(query)).toBe(false);
  });

  it.each([
    ["two Cyrillic letters", "пр"],
    ["two digits", "12"],
    ["two Latin letters", "pr"],
    ["a Cyrillic word", "жжжжж"],
  ])("accepts %s", (_name, query) => {
    expect(isSearchableQuery(query)).toBe(true);
  });
});

describe("whole-word ranking", () => {
  const withPrefixStreets: Street[] = [
    ...streets,
    {
      id: 16,
      city: "ГР.ВАРНА",
      raw_name: "ГР.ВАРНА УЛ.КОНСТАНТИН ПРЕСЛАВСКИ",
      street_part: "КОНСТАНТИН ПРЕСЛАВСКИ",
      type_marker: "УЛ.",
    },
    {
      id: 17,
      city: "ГР.ВАРНА",
      raw_name: "ГР.ВАРНА УЛ.НАУМ ПРЕСЛАВСКИ",
      street_part: "НАУМ ПРЕСЛАВСКИ",
      type_marker: "УЛ.",
    },
  ];
  const suggestions = buildExactAddressSuggestions(withPrefixStreets, [
    { id: 1001, street_id: 15, number_int: 12, number_suffix: null, entrance: null },
    { id: 1002, street_id: 16, number_int: 12, number_suffix: null, entrance: null },
    { id: 1003, street_id: 17, number_int: 12, number_suffix: null, entrance: null },
  ]);

  it.each(["преслав 12", "ПРЕСЛАВ 12", "preslav 12", "преслав 012", "ул.   преслав,12"])(
    "ranks an exact street name above longer streets it prefixes: %s",
    (query) => {
      expect(searchExactAddressSuggestions(suggestions, query).map((s) => s.addressId)).toEqual([
        1001, 1002, 1003,
      ]);
    },
  );

  it("ranks a whole-number match above a longer number that sorts earlier", () => {
    const numbers = buildExactAddressSuggestions(streets, [
      { id: 1201, street_id: 10, number_int: 120, number_suffix: null, entrance: null },
      { id: 1202, street_id: 15, number_int: 12, number_suffix: null, entrance: null },
    ]);

    expect(searchExactAddressSuggestions(numbers, "12").map((s) => s.addressId)).toEqual([
      1202, 1201,
    ]);
  });
});
