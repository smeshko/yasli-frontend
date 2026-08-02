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
 * Scenarios are documented in
 * docs/artifacts/plans/dvorat-design/SCENARIOS.md
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

const institution = (id, name, kind, basis, offering = "standard") => ({
  id,
  external_id: String(id),
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
  // S1 — all three groups populated
  1042: {
    district_code: "01",
    results: [
      institution(101, "ДЯ №4 „Пчелица“", "nursery", "district"),
      institution(102, "ДЯ №9 „Детелина“", "nursery", "district"),
      institution(103, "ДЯ №11 „Иглика“", "nursery", "district"),
      institution(201, "ДГ №14 „Дружба“", "kindergarten", "address"),
      institution(202, "ДГ №31 „Крилатко“", "kindergarten", "address"),
      institution(203, "ДГ №5 „Слънчо“", "kindergarten", "address", "infant_group"),
      institution(301, "ОУ „Захари Стоянов“ — ПГ", "preschool", "address"),
    ],
  },
  1043: { district_code: "01", results: [] },
  // S2 — preschool group empty
  2210: {
    district_code: "01",
    results: [
      institution(104, "ДЯ №1 „Щастливо детство“", "nursery", "district"),
      institution(105, "ДЯ №7 „Роза“", "nursery", "district"),
      institution(204, "ДГ №2 „Бриз“", "kindergarten", "address"),
      institution(205, "ДГ №27 „Успех“", "kindergarten", "address", "infant_group"),
    ],
  },
  // S3 — nursery group empty, and every remaining result matched by district,
  // which is what triggers the district-fallback note
  4405: {
    district_code: "04",
    results: [
      institution(206, "ДГ №39 „Пламъче“", "kindergarten", "district"),
      institution(207, "ДГ №44 „Валентина Терешкова“", "kindergarten", "district"),
      institution(208, "ДГ №18 „Радост“", "kindergarten", "district"),
      institution(302, "СУ „Найден Геров“ — ПГ", "preschool", "district"),
    ],
  },
  // S4 — kindergarten group empty
  5501: {
    district_code: "01",
    results: [
      institution(106, "ДЯ №2 „Мечо Пух“", "nursery", "district"),
      institution(303, "ОУ „Стефан Караджа“ — ПГ", "preschool", "address"),
    ],
  },
  // S5 — no confirmed district for the address
  3302: {
    district_code: null,
    results: [institution(209, "ДГ №21 „Калинка“", "kindergarten", "address")],
  },
  8802: {
    district_code: "01",
    results: [
      institution(107, "ДЯ №4 „Пчелица“", "nursery", "district"),
      institution(210, "ДГ №14 „Дружба“", "kindergarten", "address"),
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
});
