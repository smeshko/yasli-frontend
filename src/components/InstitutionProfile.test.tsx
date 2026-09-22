import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { InstitutionProfile as InstitutionProfileData } from "@/lib/api/client";
import type { StoredMatchContext } from "@/lib/search/storedSearch";

import { InstitutionProfile, InstitutionProfileView } from "./InstitutionProfile";

const NOW = new Date("2026-09-16T12:00:00Z");
const COPY_NURSERY_NOTE_START = "Яслите не са по адрес";

function street(id: number, part: string, marker: string | null = "УЛ.") {
  return {
    id,
    city: "ГР.ВАРНА",
    raw_name: `ГР.ВАРНА ${marker ?? ""}${part}`,
    street_part: part,
    type_marker: marker,
  };
}

function profile(overrides: Partial<InstitutionProfileData> = {}): InstitutionProfileData {
  return {
    id: 31,
    external_id: "46",
    name: 'ДГ№13 "Мир"',
    kind: "kindergarten",
    source_url: "https://dg.uslugi.io/lv/documents/garden/varna/rajon/46.html",
    last_seen_at: "2026-09-14T00:00:00Z",
    address: 'гр. Варна, ул. "Преслав" № 14',
    phone: "052 612 345",
    email: "dg13mir@example.bg",
    director: "Мария Иванова",
    website: "dg13mir.bg",
    district_code: "01",
    has_infant_group: false,
    location: null,
    branches: [],
    coverage: [],
    ...overrides,
  };
}

function renderView(props: Partial<Parameters<typeof InstitutionProfileView>[0]> = {}) {
  return renderToStaticMarkup(
    <InstitutionProfileView
      status="success"
      profile={profile()}
      context={null}
      kind="kindergarten"
      location={null}
      now={NOW}
      onRetry={vi.fn()}
      {...props}
    />,
  );
}

describe("InstitutionProfile island", () => {
  it("renders the loading state on the server, because effects do not run", () => {
    const html = renderToStaticMarkup(
      <InstitutionProfile kind="kindergarten" externalId="46" location={null} />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("Зареждаме данните за институцията…");
  });
});

describe("InstitutionProfileView map", () => {
  const location = { lat: 43.209589, lon: 27.926883, precision: "building" } as const;

  it("renders the map region in the success state when the manifest has a coordinate", () => {
    const markup = renderView({ location });

    expect(markup).toContain('aria-label="Карта на сградите"');
  });

  it("renders no map region when the manifest has no coordinate", () => {
    expect(renderView({ location: null })).not.toContain("profile-map");
  });

  it("puts the map between the address and the contacts", () => {
    const markup = renderView({ location });

    expect(markup.indexOf('id="profile-address"')).toBeLessThan(markup.indexOf("profile-map"));
    expect(markup.indexOf("profile-map")).toBeLessThan(markup.indexOf('id="profile-contacts"'));
  });

  it("never renders the map outside the success state", () => {
    /* Nothing else is on the page yet and there are no branches to draw, so a
       container here would be two layout shifts for no information. */
    for (const status of ["loading", "error", "not_found"] as const) {
      expect(renderView({ status, profile: null, location })).not.toContain("profile-map");
    }
  });
});

describe("InstitutionProfileView states", () => {
  it("marks the loading block as a status region", () => {
    const html = renderView({ status: "loading", profile: null });

    expect(html).toContain('role="status"');
    expect(html).toContain("Зареждаме данните за институцията…");
  });

  it("marks the error block as an alert and offers a retry button", () => {
    const html = renderView({ status: "error", profile: null });

    expect(html).toContain('role="alert"');
    expect(html).toContain("Не успяхме да заредим данните за институцията.");
    expect(html).toContain("<button");
    expect(html).toContain("Опитайте отново");
  });

  it("offers a way back from the not-found state", () => {
    const html = renderView({ status: "not_found", profile: null });

    expect(html).toContain('role="alert"');
    expect(html).toContain("Институцията вече не е в източника.");
    expect(html).toContain('href="/"');
    expect(html).toContain("Към търсенето");
  });

  it("falls back to not-found when success arrives without a profile", () => {
    const html = renderView({ status: "success", profile: null });

    expect(html).toContain("Институцията вече не е в източника.");
  });
});

describe("InstitutionProfileView kindergarten content", () => {
  const full = profile({
    coverage: [
      {
        street: street(1, "ПРЕСЛАВ"),
        addresses: [
          { id: 1, number_int: 14, number_suffix: null, entrance: null },
          { id: 2, number_int: 14, number_suffix: "А", entrance: null },
          { id: 3, number_int: 15, number_suffix: null, entrance: "А" },
        ],
      },
      {
        street: street(2, "СЛИВНИЦА", "БУЛ."),
        addresses: [{ id: 4, number_int: 84, number_suffix: null, entrance: null }],
      },
      {
        street: street(3, "ГЕНЕРАЛ КОЛЕВ"),
        addresses: [{ id: 5, number_int: 12, number_suffix: null, entrance: null }],
      },
    ],
    branches: [
      { label: "Филиал „Изгрев“", address: 'ул. "Сливница" № 84', location: null },
      { label: "Филиал „Люлин“", address: 'ул. "Генерал Колев" № 12', location: null },
      { label: "Яслена група", address: 'ул. "Преслав" № 16', location: null },
      { label: "Филиал „Морско конче“", address: null, location: null },
    ],
  });

  it("renders the address, contacts and the source link", () => {
    const html = renderView({ profile: full });

    expect(html).toContain("гр. Варна, ул. &quot;Преслав&quot; № 14");
    expect(html).toContain('href="tel:052612345"');
    expect(html).toContain('href="mailto:dg13mir@example.bg"');
    expect(html).toContain("Мария Иванова");
    expect(html).toContain('href="https://dg13mir.bg"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).toContain("↗");
    expect(html).toContain('href="https://dg.uslugi.io/lv/documents/garden/varna/rajon/46.html"');
    expect(html).toContain("Последна актуализация:");
  });

  it("renders no catchment section when the institution has one", () => {
    const html = renderView({ profile: full });

    // The street-by-street list is deliberately gone: a real catchment is
    // ~1900 addresses. With coverage present there is nothing to say, so the
    // section is absent rather than empty.
    expect(html).not.toContain("Район на прием");
    expect(html).not.toContain('class="profile-coverage"');
    expect(html).not.toContain("ул. Преслав");
    expect(html).not.toContain("бул. Сливница");
    expect(html).not.toContain("014, 014А, 015 вх.А");
  });

  it("renders every branch as text, including a label-only one", () => {
    const html = renderView({ profile: full });

    expect(html).toContain("Филиали");
    expect(html).toContain("Филиал „Изгрев“ — ул. &quot;Сливница&quot; № 84");
    expect(html).toContain("Филиал „Люлин“ — ул. &quot;Генерал Колев&quot; № 12");
    expect(html).toContain("Яслена група — ул. &quot;Преслав&quot; № 16");
    expect(html).toContain("Филиал „Морско конче“");
  });

  it("never states a district on a kindergarten page", () => {
    const html = renderView({
      profile: profile({ district_code: "02", coverage: [] }),
    });

    // Asserted on the sentence, not on the bare district name: a real
    // catchment can contain a street like "бул. Осми Приморски Полк", so a
    // substring check would fail for the wrong reason.
    expect(html).not.toContain("обслужва район");
    expect(html).not.toContain(COPY_NURSERY_NOTE_START);
    expect(html).toContain("Няма публикуван район на прием за тази градина в източника.");
  });

  it("renders its own line when the catchment is empty and all contacts are null", () => {
    const html = renderView({
      profile: profile({
        address: null,
        phone: null,
        email: null,
        director: null,
        website: null,
        coverage: [],
        branches: [],
      }),
    });

    expect(html).toContain("Район на прием");
    expect(html).toContain("Няма публикуван район на прием за тази градина в източника.");
    expect(html).toContain("Няма публикувани контакти.");
    expect(html).toContain("Адресът не е публикуван в източника.");
    expect(html).not.toContain("Филиали");
  });
});

describe("InstitutionProfileView per-kind rules", () => {
  it("shows a nursery's district and never its coverage, even when populated", () => {
    const html = renderView({
      kind: "nursery",
      profile: profile({
        kind: "nursery",
        district_code: "02",
        coverage: [
          {
            street: street(1, "ПРЕСЛАВ"),
            addresses: [{ id: 1, number_int: 14, number_suffix: null, entrance: null }],
          },
        ],
      }),
    });

    expect(html).toContain("Яслата обслужва район Приморски.");
    expect(html).toContain("Яслите не са по адрес");
    expect(html).not.toContain('class="profile-coverage"');
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("ул. Преслав");
    expect(html).not.toContain("Район на прием");
  });

  it("says so plainly when a nursery's district is unconfirmed", () => {
    const html = renderView({
      kind: "nursery",
      profile: profile({ kind: "nursery", district_code: null }),
    });

    expect(html).toContain("Районът на яслата не е потвърден в източника.");
    expect(html).toContain("Яслите не са по адрес");
  });

  /* A district code the frontend map does not know used to render the literal
     "Яслата обслужва район undefined." — an English word in Bulgarian copy on
     a live page. Unknown and absent are the same claim: we cannot confirm it. */
  it("falls back to the unconfirmed copy for an unknown district code", () => {
    const html = renderView({
      kind: "nursery",
      profile: profile({ kind: "nursery", district_code: "06" as never }),
    });

    expect(html).not.toContain("undefined");
    expect(html).toContain("Районът на яслата не е потвърден в източника.");
  });

  it("uses the researched copy for a preschool with no published catchment", () => {
    const html = renderView({
      kind: "preschool",
      profile: profile({ kind: "preschool", district_code: null, coverage: [] }),
    });

    expect(html).toContain(
      "Няма публикувано райониране за това адресно местоположение. Подайте заявление в избрано от вас училище — Община Варна не задължава да се запишете в конкретно.",
    );
  });
});

describe("InstitutionProfileView freshness", () => {
  it("shows the stale banner past fourteen days", () => {
    const html = renderView({
      profile: profile({ last_seen_at: "2026-08-17T00:00:00Z" }),
    });

    expect(html).toContain(
      "Данните са по-стари от 14 дни. Проверете и официалния източник преди кандидатстване.",
    );
  });

  it("shows no banner two days old", () => {
    const html = renderView({
      profile: profile({ last_seen_at: "2026-09-14T00:00:00Z" }),
    });

    expect(html).not.toContain("Данните са по-стари от");
  });

  it("formats the freshness date day-first", () => {
    const html = renderView({
      profile: profile({ last_seen_at: "2026-09-14T00:00:00Z" }),
    });

    expect(html).toMatch(/Последна актуализация:\s*14\.09\.2026/);
  });

  /* An unparsable `last_seen_at` used to throw out of the render path, which
     in the browser tears the island down and leaves the page with its static
     header and nothing under it — the one failure the state machine has no
     state for. The rest of the profile must still render. */
  it("drops the freshness line rather than throwing on an unparsable date", () => {
    const html = renderView({
      profile: profile({ last_seen_at: "not-a-date", address: "гр. Варна, ул. Тест 1" }),
    });

    expect(html).toContain("гр. Варна, ул. Тест 1");
    expect(html).toContain("Официален източник");
    expect(html).not.toContain("Последна актуализация:");
    expect(html).not.toContain("Данните са по-стари от");
  });
});

describe("InstitutionProfileView search context", () => {
  it("names the searched address for an address match", () => {
    const context: StoredMatchContext = {
      addressLabel: "ул. Преслав 012",
      matchBasis: "address",
    };
    const html = renderView({ context });

    expect(html).toContain("Обслужва вашия адрес: ул. Преслав 012.");
    expect(html).toContain('role="note"');
  });

  it("explains a district match rather than implying an address match", () => {
    const context: StoredMatchContext = {
      addressLabel: "ул. Преслав 012",
      matchBasis: "district",
    };
    const html = renderView({ context, kind: "nursery", profile: profile({ kind: "nursery" }) });

    expect(html).toContain(
      "Във вашия район — търсихте ул. Преслав 012. Съвпадението е по район, не по точен адрес.",
    );
  });

  it("renders no context block without a stored match", () => {
    const html = renderView({ context: null });

    expect(html).not.toContain("profile-context");
  });
});

describe("InstitutionProfileView contact links", () => {
  /* The verbatim live TEL for ДЯ № 4 (DZ_ID 4 → the real page nursery/4).
     The whole value used to become one 19-digit tel: href that dials
     nothing, while the text still read as two correct numbers. */
  it("links only the first of two numbers and still shows both", () => {
    const html = renderView({
      profile: profile({ phone: "052 820758 0885665404" }),
    });

    expect(html).toContain('href="tel:052820758"');
    expect(html).not.toContain("0528207580885665404");
    expect(html).toContain("052 820758 0885665404");
  });

  it("links only the first of two addresses and still shows both", () => {
    const html = renderView({
      profile: profile({ email: "dg13mir@example.bg, dg13@example.bg" }),
    });

    expect(html).toContain('href="mailto:dg13mir@example.bg"');
    expect(html).toContain("dg13mir@example.bg, dg13@example.bg");
  });

  it("shows an unparsable phone as text rather than a partial tel: href", () => {
    const html = renderView({ profile: profile({ phone: "по обяд" }) });

    expect(html).not.toContain("tel:");
    expect(html).toContain("по обяд");
  });
});

describe("InstitutionProfileView website safety", () => {
  it("drops a javascript: website entirely rather than linking it", () => {
    const html = renderView({
      profile: profile({
        phone: null,
        email: null,
        director: null,
        website: "javascript:alert(1)",
      }),
    });

    expect(html).not.toContain("Уебсайт");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("Няма публикувани контакти.");
  });

  /* source_url is scraped from the same pipeline as website and reached an
     href unchecked; the criterion says *every* outbound link is http(s). */
  it("drops the source link when source_url is not an absolute http(s) url", () => {
    const html = renderView({
      profile: profile({ source_url: "/lv/documents/garden/varna/rajon/46.html" }),
    });

    expect(html).not.toContain("Официален източник");
    expect(html).not.toContain("/lv/documents/garden/varna/rajon/46.html");
  });

  it("keeps the source link when source_url is absolute", () => {
    const html = renderView({ profile: profile({ source_url: "https://dg.uslugi.io/46.html" }) });

    expect(html).toContain('href="https://dg.uslugi.io/46.html"');
    expect(html).toContain("Официален източник");
  });

  it("upgrades a bare host to https", () => {
    const html = renderView({ profile: profile({ website: "dg13.bg" }) });

    expect(html).toContain('href="https://dg13.bg"');
  });

  it("only ever emits safe href schemes", () => {
    const html = renderView({
      profile: profile({
        website: "dg13.bg",
        branches: [{ label: "Филиал", address: "ул. Тест 1", location: null }],
      }),
      context: { addressLabel: "ул. Преслав 012", matchBasis: "address" },
    });

    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toMatch(/^(https?:\/\/|tel:|mailto:|\/)/);
    }
  });
});
