import type { InstitutionLocation } from "../api/client";
import type { ReceptionKind } from "../domain/kinds";

/**
 * The coordinate the manifest carries, straight from the API's `Location`
 * schema so the committed file and the fetched payload can never drift apart.
 */
export type ManifestLocation = InstitutionLocation;

/**
 * One row of `src/data/institutions-manifest.json`, the committed output of
 * `npm run institutions:manifest`. The manifest is the build's only source of
 * institution pages: `getStaticPaths` reads it, so a page exists exactly for
 * the rows in that file.
 *
 * `location` is `null` for the infant-group nursery rows, whose building is
 * keyed only under their kindergarten twin — those pages render no map and no
 * link-outs.
 */
export interface ManifestEntry {
  kind: ReceptionKind;
  external_id: string;
  name: string;
  location: ManifestLocation | null;
}

export interface InstitutionStaticPath {
  params: { slug: string };
  props: ManifestEntry;
}

/** `(kind, external_id)` is the backend's unique key, so the slug carries both. */
export function buildInstitutionSlug(kind: ReceptionKind, externalId: string): string {
  return `${kind}-${externalId}`;
}

export function institutionPath(kind: ReceptionKind, externalId: string): string {
  return `/institution/${buildInstitutionSlug(kind, externalId)}/`;
}

export function manifestToStaticPaths(entries: readonly ManifestEntry[]): InstitutionStaticPath[] {
  return entries.map((entry) => ({
    params: { slug: buildInstitutionSlug(entry.kind, entry.external_id) },
    props: entry,
  }));
}

/**
 * The slugs alone, in manifest order — the contents of the committed
 * `src/data/institution-slugs.json`.
 *
 * That second artifact exists so the search screen can answer "does this
 * institution have a page" without importing 95 full rows, coordinates and
 * all, into its bundle. Both files are written by one generator run, and both
 * build their slugs here so they cannot disagree.
 */
export function manifestToSlugs(entries: readonly ManifestEntry[]): string[] {
  return entries.map((entry) => buildInstitutionSlug(entry.kind, entry.external_id));
}

export function buildSlugSet(entries: readonly ManifestEntry[]): ReadonlySet<string> {
  return new Set(entries.map((entry) => buildInstitutionSlug(entry.kind, entry.external_id)));
}
