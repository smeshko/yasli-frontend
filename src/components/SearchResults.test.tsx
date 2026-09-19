import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { MatchResult } from "@/lib/api/client";
import { groupMatchResults } from "@/lib/search/results";

import { type MatchState } from "./SearchExperience";
import { SearchResults } from "./SearchResults";

/* The (institution_kind, external_id) pairs the cases below render. A real
   page exists only for slugs in the committed manifest, so SearchResults
   takes the set as a prop and the tests pass an explicit one. */
const PAGE_SLUGS = new Set([
  "kindergarten-42",
  "nursery-43",
  "preschool-44",
  "kindergarten-3",
  "preschool-7",
]);

function matchResult(overrides: Partial<MatchResult> = {}): MatchResult {
  const id = overrides.id ?? 1;

  return {
    id,
    external_id: String(id),
    name: "ДГ Тест",
    institution_kind: "kindergarten",
    reception_kind: "kindergarten",
    offering: "standard",
    source_url: `https://example.test/${id}`,
    match_basis: "address",
    has_infant_group: false,
    ...overrides,
  };
}

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
        matchResult({
          id: 42,
          name: "ДГ Тест",
          source_url: "https://example.test/source",
        }),
        matchResult({
          id: 43,
          name: "Я Тест",
          institution_kind: "nursery",
          reception_kind: "nursery",
          source_url: "https://example.test/nursery",
          match_basis: "district",
        }),
        matchResult({
          id: 44,
          name: "ПГ Тест",
          institution_kind: "preschool",
          reception_kind: "preschool",
          source_url: "https://example.test/preschool",
        }),
      ]),
    };

    const html = renderToStaticMarkup(
      <SearchResults
        filter="all"
        matchState={matchState}
        pageSlugs={PAGE_SLUGS}
        staleResults={false}
        onFilterChange={vi.fn()}
        onRetryStale={vi.fn()}
      />,
    );

    /* The search field above still shows the address, so the results do not
       echo it — and the match basis is not printed on the cards at all: it was
       the same line on nearly every one. */
    expect(html).not.toContain("Избран адрес");
    expect(html).not.toContain("по вашия адрес");
    expect(html).not.toContain("по вашия район");
    expect(html.indexOf("Ясла")).toBeLessThan(html.indexOf("Детска градина"));
    expect(html.indexOf("Детска градина")).toBeLessThan(html.indexOf("Подготвителна група"));
    expect(html).toContain("ДГ Тест");
    expect(html).toContain("Я Тест");
    expect(html).toContain("ПГ Тест");
    expect(html).toContain('href="/institution/kindergarten-42/"');
    expect(html).toContain('href="/institution/nursery-43/"');
    // Every pair here has a page, so the card itself navigates and no card
    // carries a source link.
    expect(html).not.toContain("Източник");
    expect(html).not.toContain('href="https://example.test/source"');
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
        matchResult({
          id: 3,
          name: "ДГ Частичен резултат",
          source_url: "https://example.test/source",
        }),
      ]),
    };

    const html = renderToStaticMarkup(
      <SearchResults
        filter="all"
        matchState={matchState}
        pageSlugs={PAGE_SLUGS}
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
        pageSlugs={PAGE_SLUGS}
        staleResults={false}
        onFilterChange={vi.fn()}
        onRetryStale={vi.fn()}
      />,
    );

    expect(html).toContain("За избрания адрес все още няма потвърден район");
    expect(html).toContain("Покритието за ясли е непълно");
    expect(html).not.toContain("В това село няма ясла");
  });

  it("renders infant-group offerings under nurseries with a concise suffix", () => {
    const matchState: MatchState = {
      status: "success",
      address: {
        id: 10,
        district_code: "01",
        settlement: null,
      },
      selectedAddress: null,
      grouped: groupMatchResults([
        matchResult({
          id: 42,
          name: "ДГ Тест",
          has_infant_group: true,
        }),
        matchResult({
          id: 42,
          name: "ДГ Тест",
          reception_kind: "nursery",
          offering: "infant_group",
          has_infant_group: true,
        }),
      ]),
    };

    const html = renderToStaticMarkup(
      <SearchResults
        filter="all"
        matchState={matchState}
        pageSlugs={PAGE_SLUGS}
        staleResults={false}
        onFilterChange={vi.fn()}
        onRetryStale={vi.fn()}
      />,
    );

    expect(html).toContain("ДГ Тест (яслена група)");
    // The link wraps the text block, so the heading itself stays bare.
    expect(html).toContain("<h3>ДГ Тест</h3>");
    expect(html).toContain('<a class="card-link" href="/institution/kindergarten-42/">');
    // The href uses institution_kind, so the infant-group row listed under
    // nurseries points at the kindergarten's own page, not a nursery slug.
    expect(html.match(/href="\/institution\/kindergarten-42\/"/g)).toHaveLength(2);
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
        matchResult({
          id: 7,
          name: "ПГ Район",
          institution_kind: "preschool",
          reception_kind: "preschool",
          source_url: "https://example.test/preschool",
          match_basis: "district",
        }),
      ]),
    };

    const html = renderToStaticMarkup(
      <SearchResults
        filter="preschool"
        matchState={matchState}
        pageSlugs={PAGE_SLUGS}
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
        pageSlugs={PAGE_SLUGS}
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
        pageSlugs={PAGE_SLUGS}
        staleResults={false}
        onFilterChange={vi.fn()}
        onRetryStale={vi.fn()}
      />,
    );

    expect(html).toContain("Презареди адресите");
    expect(html).toContain("Данните за избрания адрес са обновени");
  });
});

describe("SearchResults detail links", () => {
  const matchState = (): MatchState => ({
    status: "success",
    address: { id: 10, district_code: "01", settlement: null },
    selectedAddress: null,
    grouped: groupMatchResults([
      matchResult({ id: 42 }),
      matchResult({ id: 99, name: "ДГ Нова", external_id: "999999" }),
    ]),
  });

  function render(pageSlugs: ReadonlySet<string>) {
    return renderToStaticMarkup(
      <SearchResults
        filter="all"
        matchState={matchState()}
        pageSlugs={pageSlugs}
        staleResults={false}
        onFilterChange={vi.fn()}
        onRetryStale={vi.fn()}
      />,
    );
  }

  it("links only the institution the manifest knows", () => {
    const html = render(new Set(["kindergarten-42"]));

    expect(html).toContain('href="/institution/kindergarten-42/"');
    expect(html).not.toContain("/institution/kindergarten-999999/");
  });

  it("falls back to source links for every card when no page exists", () => {
    const html = render(new Set());

    expect(html).not.toContain("/institution/");
    expect(html).not.toContain("card-link");
    expect(html.match(/Източник/g)).toHaveLength(2);
  });

  it("keeps the source link on a card with no page, so it is never a dead end", () => {
    const html = render(new Set(["kindergarten-42"]));
    const cards = html.split('class="result-card"');
    const unknownCard = cards.find((card) => card.includes("ДГ Нова"));

    expect(unknownCard).toBeDefined();
    expect(unknownCard).toContain("Източник");
    expect(unknownCard).toContain('target="_blank"');
    expect(unknownCard).not.toContain("/institution/");
    expect(unknownCard).not.toContain("card-link");
    expect(unknownCard).not.toContain("data-linked");
  });

  it("makes the name the card's only control on a linked card", () => {
    const html = render(new Set(["kindergarten-42"]));
    const linkedCard = html
      .split('class="result-card"')
      .find((card) => card.includes("ДГ Тест"));

    expect(linkedCard).toBeDefined();
    // One link, stretched over the card by CSS, labelled with the
    // institution's name. No separate Детайли, no source link.
    expect(linkedCard!.match(/<a /g)).toHaveLength(1);
    expect(linkedCard).toContain('class="card-link"');
    expect(linkedCard).toContain('href="/institution/kindergarten-42/"');
    expect(linkedCard).not.toContain("Детайли");
    expect(linkedCard).not.toContain("Източник");
    expect(linkedCard).toContain('data-linked=""');
  });


});
