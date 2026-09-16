// Regenerates src/data/institutions-manifest.json from a live backend.
//
// Like scripts/generate-api-types.mjs this is never run in CI: the committed
// file is the build input, and `npm run build` needs no backend. Re-run it
// (and redeploy) whenever the institution list changes.
//
// Always pass YASLI_INSTITUTIONS_URL explicitly when the fixture server may
// be up: the default URL is the fixture server's port, and it answers
// /api/institutions with a handful of synthetic rows.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

const source = process.env.YASLI_INSTITUTIONS_URL?.trim() || "http://localhost:8000/api/institutions";
const outputPath = resolve("src/data/institutions-manifest.json");
const KIND_ORDER = ["nursery", "kindergarten", "preschool"];
const REQUIRED_FIELDS = ["kind", "external_id", "name"];

function fail(reason) {
  console.error(`error: ${reason}`);
  process.exit(1);
}

let response;
try {
  response = await fetch(source);
} catch (error) {
  fail(`could not reach ${source}: ${error instanceof Error ? error.message : String(error)}`);
}

if (!response.ok) {
  fail(`${source} answered HTTP ${response.status}`);
}

let payload;
try {
  payload = await response.json();
} catch {
  fail(`${source} did not return valid JSON`);
}

if (!Array.isArray(payload)) {
  fail(`${source} did not return an array`);
}

if (payload.length === 0) {
  fail(`${source} returned no institutions`);
}

const seen = new Set();
const rows = payload.map((row, index) => {
  if (row === null || typeof row !== "object") {
    fail(`row ${index} is not an object`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (typeof row[field] !== "string" || row[field].length === 0) {
      fail(`row ${index} is missing "${field}"`);
    }
  }

  if (!KIND_ORDER.includes(row.kind)) {
    fail(`row ${index} has an unknown kind "${row.kind}"`);
  }

  const key = `${row.kind}/${row.external_id}`;
  if (seen.has(key)) {
    fail(`duplicate institution ${key}`);
  }
  seen.add(key);

  return { kind: row.kind, external_id: row.external_id, name: row.name };
});

rows.sort(compareRows);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(rows, null, 2)}\n`);

console.log(`wrote ${rows.length} institutions from ${source} to ${relative(process.cwd(), outputPath)}`);

// Our own key (kind order, then numeric external_id) rather than the API's
// order, so the committed diff stays stable if the backend's ordering changes.
function compareRows(a, b) {
  const kindDelta = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
  if (kindDelta !== 0) {
    return kindDelta;
  }
  return compareExternalIds(a.external_id, b.external_id);
}

function compareExternalIds(a, b) {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    return Number(a) - Number(b);
  }
  return a < b ? -1 : a > b ? 1 : 0;
}
