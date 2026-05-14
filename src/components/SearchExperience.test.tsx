import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { groupMatchResults } from "@/lib/search/results";

import { SearchExperience, SearchResults, type MatchState } from "./SearchExperience";

describe("SearchExperience", () => {
  it("renders the final initial search surface", () => {
    const html = renderToStaticMarkup(<SearchExperience />);

    expect(html).toContain("Коя е моята градина?");
    expect(html).toContain("бул. Генерал Колев 85");
  });
});

describe("SearchResults", () => {
  it("renders the primary happy path", () => {
    const matchState: MatchState = {
      status: "success",
      selectedAddress: {
        id: "10",
        addressId: 10,
        streetId: 1,
        label: "бул. Генерал Колев 085",
        context: "гр. Варна",
        numberLabel: "085",
        searchText: "БУЛ ГЕНЕРАЛ КОЛЕВ 085",
      },
      grouped: groupMatchResults([
        {
          id: 42,
          external_id: "42",
          name: "ДГ Тест",
          kind: "kindergarten",
          source_url: "https://example.test/source",
          match_type: "street",
        },
      ]),
    };

    const html = renderToStaticMarkup(
      <SearchResults
        filter="all"
        matchState={matchState}
        staleResults={false}
        onFilterChange={vi.fn()}
        onRetryStale={vi.fn()}
      />,
    );

    expect(html).toContain("Избран адрес: бул. Генерал Колев 085");
    expect(html).toContain("ДГ Тест");
    expect(html).not.toMatch(/href="\/institutions\//);
  });

  it("renders a partial match with empty nursery explanation", () => {
    const matchState: MatchState = {
      status: "success",
      selectedAddress: null,
      districtUnknown: true,
      grouped: groupMatchResults([
        {
          id: 3,
          external_id: "3",
          name: "ДГ Частичен резултат",
          kind: "kindergarten",
          source_url: "https://example.test/source",
          match_type: "street",
        },
      ]),
    };

    const html = renderToStaticMarkup(
      <SearchResults
        filter="all"
        matchState={matchState}
        staleResults={false}
        onFilterChange={vi.fn()}
        onRetryStale={vi.fn()}
      />,
    );

    expect(html).toContain("Покритието за ясли е непълно");
    expect(html).toContain("Районът за този адрес още не е зареден");
    expect(html).toContain("ДГ Частичен резултат");
  });

  it("renders API failure state", () => {
    const matchState: MatchState = {
      status: "error",
      selectedAddress: null,
      grouped: null,
      message: "Не успяхме да заредим резултатите. Опитайте отново.",
    };

    const html = renderToStaticMarkup(
      <SearchResults
        filter="all"
        matchState={matchState}
        staleResults={false}
        onFilterChange={vi.fn()}
        onRetryStale={vi.fn()}
      />,
    );

    expect(html).toContain("Не успяхме да заредим резултатите");
  });
});
