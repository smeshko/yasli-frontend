import { describe, expect, it } from "vitest";

import type { Address, Street } from "@/lib/api/client";

import {
  buildExactAddressSuggestions,
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
});
