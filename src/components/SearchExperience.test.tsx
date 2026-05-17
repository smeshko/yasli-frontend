import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { groupMatchResults } from "@/lib/search/results";

import { SearchExperience, SearchResults, type MatchState } from "./SearchExperience";

describe("SearchExperience", () => {
  it("renders the final initial search surface", () => {
    const html = renderToStaticMarkup(<SearchExperience />);

    expect(html).toContain("Коя е моята градина?");
    expect(html).toContain("ул. Преслав 12");
  });
});

describe("SearchResults", () => {
  it("renders the primary happy path", () => {
    const matchState: MatchState = {
      status: "success",
      address: {
        id: 10,
        district_code: "01",
        settlement: {
          code: "10135",
          name: "ГР.ВАРНА",
          locality_type: "city",
        },
      },
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
          institution_kind: "kindergarten",
          source_url: "https://example.test/source",
          match_basis: "address",
          has_infant_group: false,
        },
        {
          id: 43,
          external_id: "43",
          name: "Я Тест",
          institution_kind: "nursery",
          source_url: "https://example.test/nursery",
          match_basis: "district",
          has_infant_group: false,
        },
        {
          id: 44,
          external_id: "44",
          name: "ПГ Тест",
          institution_kind: "preschool",
          source_url: "https://example.test/preschool",
          match_basis: "address",
          has_infant_group: false,
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
    expect(html.indexOf("Ясла")).toBeLessThan(html.indexOf("Детска градина"));
    expect(html.indexOf("Детска градина")).toBeLessThan(html.indexOf("Подготвителна група"));
    expect(html).toContain("ДГ Тест");
    expect(html).toContain("Я Тест");
    expect(html).toContain("ПГ Тест");
    expect(html).toContain('href="https://example.test/source"');
    expect(html).not.toMatch(/href="\/institutions\//);
  });

  it("renders generic missing-district copy for a city address", () => {
    const matchState: MatchState = {
      status: "success",
      address: {
        id: 6,
        district_code: null,
        settlement: {
          code: "10135",
          name: "ГР.ВАРНА",
          locality_type: "city",
        },
      },
      selectedAddress: null,
      grouped: groupMatchResults([
        {
          id: 3,
          external_id: "3",
          name: "ДГ Частичен резултат",
          institution_kind: "kindergarten",
          source_url: "https://example.test/source",
          match_basis: "address",
          has_infant_group: false,
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
    expect(html).toContain("За избрания адрес все още няма потвърден район");
    expect(html).not.toContain("В това село няма ясла");
    expect(html).toContain("ДГ Частичен резултат");
  });

  it("renders the same missing-district copy for a village address", () => {
    const matchState: MatchState = {
      status: "success",
      address: {
        id: 5,
        district_code: null,
        settlement: {
          code: "35701",
          name: "С.КАМЕНАР",
          locality_type: "village",
        },
      },
      selectedAddress: null,
      grouped: groupMatchResults([]),
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

    expect(html).toContain("За избрания адрес все още няма потвърден район");
    expect(html).toContain("Покритието за ясли е непълно");
    expect(html).not.toContain("В това село няма ясла");
  });

  it("renders preschool district fallback from match basis", () => {
    const matchState: MatchState = {
      status: "success",
      address: {
        id: 2,
        district_code: "01",
        settlement: null,
      },
      selectedAddress: null,
      grouped: groupMatchResults([
        {
          id: 7,
          external_id: "7",
          name: "ПГ Район",
          institution_kind: "preschool",
          source_url: "https://example.test/preschool",
          match_basis: "district",
          has_infant_group: false,
        },
      ]),
    };

    const html = renderToStaticMarkup(
      <SearchResults
        filter="preschool"
        matchState={matchState}
        staleResults={false}
        onFilterChange={vi.fn()}
        onRetryStale={vi.fn()}
      />,
    );

    expect(html).toContain("Няма адресно съвпадение за тази група");
    expect(html).toContain("ПГ Район");
  });

  it("renders API failure state", () => {
    const matchState: MatchState = {
      status: "error",
      address: null,
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

  it("renders stale address retry state", () => {
    const matchState: MatchState = {
      status: "stale",
      address: null,
      selectedAddress: null,
      grouped: null,
      message: "Данните за избрания адрес са обновени. Презаредете списъка и опитайте отново.",
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

    expect(html).toContain("Презареди адресите");
    expect(html).toContain("Данните за избрания адрес са обновени");
  });
});
