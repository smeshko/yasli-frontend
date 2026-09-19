#!/usr/bin/env node
/**
 * Deterministic fixture backend for runtime verification.
 *
 * The frontend talks to a separate service (PUBLIC_YASLI_API_BASE_URL, default
 * http://localhost:8000). Nothing in this repository serves it, so every
 * result state — empty groups, district fallback, stale data, error paths —
 * would otherwise depend on whatever a local Postgres happened to hold. This
 * server answers the same contract from fixed data so screenshots are
 * reproducible from a clean checkout.
 *
 * Dev-only. Nothing under src/ imports it and it never reaches the build.
 *
 *   FIXTURE_SCENARIO=S1 node scripts/fixture-server.mjs
 *
 * Search scenarios (S1–S9) are documented in
 * docs/artifacts/plans/archive/2026-08-02-dvorat-design/SCENARIOS.md;
 * institution-page scenarios (D1–D3, the by-source profiles) in
 * docs/artifacts/plans/institution-detail-route/SCENARIOS.md
 */

import { createServer } from "node:http";

const PORT = Number(process.env.FIXTURE_PORT ?? 8000);
const SCENARIO = (process.env.FIXTURE_SCENARIO ?? "S1").toUpperCase();

const DAY = 24 * 60 * 60 * 1000;

/**
 * Freshness is compared against the runtime clock (shouldShowStaleBanner uses
 * `new Date()` with a 14-day threshold), so timestamps MUST be relative to
 * startup. Hardcoded dates would silently age past the threshold and every
 * baseline scenario would start rendering the stale banner.
 */
const STARTED_AT = Date.now();
const lastSeenAt = (daysAgo) => new Date(STARTED_AT - daysAgo * DAY).toISOString();
const FRESH_DAYS = 2;
const STALE_DAYS = 30;

// --- reference data ---------------------------------------------------------

const STREETS = [
  { id: 1, city: "ГР.ВАРНА", raw_name: "ГР.ВАРНА УЛ.ПРЕСЛАВ", street_part: "ПРЕСЛАВ", type_marker: "УЛ." },
  { id: 2, city: "ГР.ВАРНА", raw_name: "ГР.ВАРНА БУЛ.СЛИВНИЦА", street_part: "СЛИВНИЦА", type_marker: "БУЛ." },
  { id: 3, city: "ГР.ВАРНА", raw_name: "ГР.ВАРНА УЛ.ДРИН", street_part: "ДРИН", type_marker: "УЛ." },
  { id: 4, city: "ГР.ВАРНА", raw_name: "ГР.ВАРНА УЛ.МАКЕДОНИЯ", street_part: "МАКЕДОНИЯ", type_marker: "УЛ." },
  { id: 5, city: "ГР.ВАРНА", raw_name: "ГР.ВАРНА Ж.К.ЧАЙКА", street_part: "ЧАЙКА", type_marker: "Ж.К." },
  { id: 6, city: "ГР.ВАРНА", raw_name: "ГР.ВАРНА УЛ.ГЕНЕРАЛ КОЛЕВ", street_part: "ГЕНЕРАЛ КОЛЕВ", type_marker: "УЛ." },
];

const ADDRESSES = [
  { id: 1042, street_id: 1, number_int: 12, number_suffix: null, entrance: null },
  { id: 1043, street_id: 1, number_int: 27, number_suffix: null, entrance: null },
  { id: 2210, street_id: 2, number_int: 84, number_suffix: null, entrance: null },
  { id: 4405, street_id: 3, number_int: 5, number_suffix: null, entrance: null },
  { id: 5501, street_id: 4, number_int: 118, number_suffix: null, entrance: null },
  { id: 3302, street_id: 5, number_int: 12, number_suffix: null, entrance: "А" },
  { id: 8802, street_id: 6, number_int: 12, number_suffix: null, entrance: null },
];

const KINDS = ["nursery", "kindergarten", "preschool"];

const institution = (id, externalId, name, kind, basis, offering = "standard") => ({
  id,
  external_id: externalId,
  name,
  institution_kind: kind,
  reception_kind: kind === "kindergarten" && offering === "infant_group" ? "nursery" : kind,
  offering,
  source_url: `https://dg.uslugi.io/institution/${id}`,
  match_basis: basis,
  has_infant_group: offering === "infant_group",
});

// --- per-address result sets ------------------------------------------------

const RESULTS = {
  // S1 — all three groups populated. Rows carry real (kind, external_id)
  // pairs from src/data/institutions-manifest.json so "Детайли" lands on a
  // page that exists; kindergarten/46, nursery/4 and preschool/12 also have
  // PROFILES entries. kindergarten/999999 is deliberately NOT in the manifest:
  // its card renders "Източник" only (the manifest guard on result cards).
  1042: {
    district_code: "01",
    results: [
      institution(101, "4", 'ДЯ № 4 "Приказен свят"', "nursery", "district"),
      institution(102, "9", 'ДЯ № 9 "ДЕТЕЛИНА"', "nursery", "district"),
      institution(103, "11", 'ДЯ № 13 "РУСАЛКА"', "nursery", "district"),
      institution(201, "46", 'ДГ№13 "Мир"', "kindergarten", "address"),
      institution(202, "999999", "ДГ „Нова градина“", "kindergarten", "address"),
      institution(203, "38", 'ДГ№5 "Слънчо"', "kindergarten", "address", "infant_group"),
      institution(301, "12", 'ОУ "Панайот Волов"', "preschool", "address"),
    ],
  },
  1043: { district_code: "01", results: [] },
  // S2 — preschool group empty
  2210: {
    district_code: "01",
    results: [
      institution(104, "104", "ДЯ №1 „Щастливо детство“", "nursery", "district"),
      institution(105, "105", "ДЯ №7 „Роза“", "nursery", "district"),
      institution(204, "204", "ДГ №2 „Бриз“", "kindergarten", "address"),
      institution(205, "205", "ДГ №27 „Успех“", "kindergarten", "address", "infant_group"),
    ],
  },
  // S3 — nursery group empty, and every remaining result matched by district,
  // which is what triggers the district-fallback note
  4405: {
    district_code: "04",
    results: [
      institution(206, "206", "ДГ №39 „Пламъче“", "kindergarten", "district"),
      institution(207, "207", "ДГ №44 „Валентина Терешкова“", "kindergarten", "district"),
      institution(208, "208", "ДГ №18 „Радост“", "kindergarten", "district"),
      institution(302, "302", "СУ „Найден Геров“ — ПГ", "preschool", "district"),
    ],
  },
  // S4 — kindergarten group empty
  5501: {
    district_code: "01",
    results: [
      institution(106, "106", "ДЯ №2 „Мечо Пух“", "nursery", "district"),
      institution(303, "303", "ОУ „Стефан Караджа“ — ПГ", "preschool", "address"),
    ],
  },
  // S5 — no confirmed district for the address
  3302: {
    district_code: null,
    results: [institution(209, "209", "ДГ №21 „Калинка“", "kindergarten", "address")],
  },
  8802: {
    district_code: "01",
    results: [
      institution(107, "107", "ДЯ №4 „Пчелица“", "nursery", "district"),
      institution(210, "210", "ДГ №14 „Дружба“", "kindergarten", "address"),
    ],
  },
};

const INSTITUTIONS = [
  { id: 101, external_id: "101", name: "ДЯ №4 „Пчелица“", kind: "nursery" },
  { id: 201, external_id: "201", name: "ДГ №14 „Дружба“", kind: "kindergarten" },
  { id: 301, external_id: "301", name: "ОУ „Захари Стоянов“ — ПГ", kind: "preschool" },
].map((item) => ({
  ...item,
  source_url: `https://dg.uslugi.io/institution/${item.id}`,
  last_seen_at: lastSeenAt(SCENARIO === "S6" ? STALE_DAYS : FRESH_DAYS),
}));

// --- institution profiles (backend phase 1.3 contract) ----------------------
//
// Served by GET /api/institutions/by-source/:kind/:external_id. Keys are REAL
// (kind, external_id) pairs from src/data/institutions-manifest.json: `astro
// dev` only serves the slugs getStaticPaths returns, so a profile keyed to a
// made-up id would be unreachable in the browser. The content is synthetic
// (Мир-shaped for kindergarten/46), not real data — the real-backend check
// lives in the plan's final validation.
//
// Deliberately absent: kindergarten/35 (ДГ№2 "Щастливо детство") — a real
// manifest slug with a page but no profile, so the page renders its in-page
// not-found state. kindergarten/999999 (the S1 card outside the manifest) is
// absent here too and has no page at all.

const coverageGroup = (street, rows) => ({
  street,
  addresses: rows.map(([id, number_int, number_suffix = null, entrance = null]) => ({
    id,
    number_int,
    number_suffix,
    entrance,
  })),
});

const profile = (fields) => ({
  address: null,
  phone: null,
  email: null,
  director: null,
  website: null,
  district_code: null,
  // Shipped by backend 1.3 but not rendered by the detail page; present so a
  // profile matches the real InstitutionDetail schema field for field.
  has_infant_group: false,
  location: null,
  coverage: [],
  branches: [],
  ...fields,
});

const PROFILES = {
  // Full: address, all four contacts, three streets (server order, with a
  // suffix and an entrance), district 01, four branches (one label-only).
  "kindergarten/46": profile({
    id: 31,
    external_id: "46",
    name: 'ДГ№13 "Мир"',
    kind: "kindergarten",
    source_url: "https://dg.uslugi.io/lv/documents/garden/varna/rajon/46.html",
    address: 'гр. Варна, ул. "Преслав" № 14',
    phone: "052 612 345",
    email: "dg13mir@example.bg",
    director: "Мария Иванова",
    website: "dg13mir.bg",
    district_code: "01",
    has_infant_group: true,
    location: { lat: 43.2041, lon: 27.9108, precision: "building" },
    coverage: [
      coverageGroup(STREETS[0], [[1, 14], [2, 14, "А"], [3, 15, null, "А"], [4, 16]]),
      coverageGroup(STREETS[1], [[5, 84], [6, 86], [7, 88, "Б"]]),
      coverageGroup(STREETS[5], [[8, 12], [9, 12, null, "Б"], [10, 13]]),
    ],
    branches: [
      {
        label: "Филиал „Изгрев“",
        address: 'ул. "Сливница" № 84',
        location: { lat: 43.2102, lon: 27.9187, precision: "building" },
      },
      {
        label: "Филиал „Люлин“",
        address: 'ул. "Генерал Колев" № 12',
        location: { lat: 43.2011, lon: 27.9042, precision: "building" },
      },
      { label: "Яслена група", address: 'ул. "Преслав" № 16', location: null },
      { label: "Филиал „Морско конче“", address: null, location: null },
    ],
  }),
  // Nursery: address and phone only, district 02, no catchment, no branches.
  "nursery/4": profile({
    id: 5,
    external_id: "4",
    name: 'ДЯ № 4 "Приказен свят"',
    kind: "nursery",
    source_url: "https://dg.uslugi.io/lv/documents/infant/varna/rajon/4.html",
    address: 'гр. Варна, ул. "Дрин" № 5',
    phone: "052 654 321",
    district_code: "02",
    location: { lat: 43.2155, lon: 27.9231, precision: "building" },
  }),
  // Preschool: address and website only, no published catchment, no district.
  "preschool/12": profile({
    id: 12,
    external_id: "12",
    name: 'ОУ "Панайот Волов"',
    kind: "preschool",
    source_url: "https://dg.uslugi.io/lv/documents/preschool/varna/rajon/12.html",
    address: 'гр. Варна, ж.к. "Чайка" № 12',
    website: "https://ou-volov.bg/",
    location: { lat: 43.2189, lon: 27.9312, precision: "building" },
  }),
  // The "nothing published" edge: every contact null, no address, no
  // catchment, no branches.
  "kindergarten/34": profile({
    id: 19,
    external_id: "34",
    name: 'ДГ№1 "Светулка"',
    kind: "kindergarten",
    source_url: "https://dg.uslugi.io/lv/documents/garden/varna/rajon/34.html",
    district_code: "03",
  }),
};

// --- scenario-driven failure injection --------------------------------------

let streetsCallCount = 0;

function shouldFailStreets() {
  // S9 fails the first reference-data load only, so the "Опитайте пак" retry
  // has something to recover to.
  if (SCENARIO !== "S9") return false;
  streetsCallCount += 1;
  return streetsCallCount === 1;
}

// --- server -----------------------------------------------------------------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Accept, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { ...CORS, "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (url.pathname === "/api/streets") {
    if (shouldFailStreets()) {
      send(res, 500, { error: "internal_error" });
      return;
    }
    send(res, 200, STREETS);
    return;
  }

  if (url.pathname === "/api/addresses") {
    send(res, 200, ADDRESSES);
    return;
  }

  if (url.pathname === "/api/institutions") {
    send(res, 200, INSTITUTIONS);
    return;
  }

  const bySource = url.pathname.match(/^\/api\/institutions\/by-source\/([^/]+)\/([^/]+)$/);

  if (bySource) {
    if (SCENARIO === "D3") {
      send(res, 500, { error: "internal_error" });
      return;
    }

    const kind = decodeURIComponent(bySource[1]);
    const externalId = decodeURIComponent(bySource[2]);

    if (!KINDS.includes(kind)) {
      // FastAPI's enum validation shape, so an invalid kind is a 422, not a 404.
      send(res, 422, {
        detail: [{ type: "enum", loc: ["path", "kind"], msg: "Input should be 'nursery', 'kindergarten' or 'preschool'" }],
      });
      return;
    }

    const entry = PROFILES[`${kind}/${externalId}`];

    if (!entry) {
      // Byte-exact, like S8: the client maps a 404 to `institution_not_found`
      // only when the body is exactly {"error":"institution_not_found"}.
      send(res, 404, { error: "institution_not_found" });
      return;
    }

    send(res, 200, {
      ...entry,
      last_seen_at: lastSeenAt(SCENARIO === "D2" ? STALE_DAYS : FRESH_DAYS),
    });
    return;
  }

  if (url.pathname === "/api/match") {
    if (SCENARIO === "S7") {
      send(res, 500, { error: "internal_error" });
      return;
    }
    if (SCENARIO === "S8") {
      // Byte-exact: the client only maps to `address_not_found` on a 404 whose
      // body is exactly {"error":"address_not_found"}. Anything else degrades
      // to a generic http_error and the wrong state renders.
      send(res, 404, { error: "address_not_found" });
      return;
    }

    const addressId = Number(url.searchParams.get("address_id"));
    const entry = RESULTS[addressId];

    if (!entry) {
      send(res, 404, { error: "address_not_found" });
      return;
    }

    send(res, 200, {
      address: {
        id: addressId,
        district_code: entry.district_code,
        settlement: { code: "VAR01", name: "Варна", locality_type: "city" },
      },
      results: entry.results,
    });
    return;
  }

  send(res, 404, { error: "not_found" });
});

server.listen(PORT, () => {
  const freshness = SCENARIO === "S6" ? STALE_DAYS : FRESH_DAYS;
  console.log(`fixture-server: http://localhost:${PORT}`);
  console.log(`  scenario:     ${SCENARIO}`);
  console.log(`  last_seen_at: ${lastSeenAt(freshness)} (${freshness} days ago)`);
  if (SCENARIO === "S6") console.log("  -> stale banner expected (threshold is 14 days)");
  if (SCENARIO === "S7") console.log("  -> /api/match returns 500: error message, no retry control");
  if (SCENARIO === "S8") console.log("  -> /api/match returns address_not_found: retry button shown");
  if (SCENARIO === "S9") console.log("  -> /api/streets fails once, then recovers");
  if (SCENARIO === "D2") console.log(`  -> by-source profiles are ${STALE_DAYS} days old: stale banner expected on institution pages`);
  if (SCENARIO === "D3") console.log("  -> /api/institutions/by-source returns 500: error state with retry");
});
