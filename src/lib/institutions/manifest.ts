import type { ReceptionKind } from "../domain/kinds";

/**
 * One row of `src/data/institutions-manifest.json`, the committed output of
 * `npm run institutions:manifest`. The manifest is the build's only source of
 * institution pages: `getStaticPaths` reads it, so a page exists exactly for
 * the rows in that file.
 */
export interface ManifestEntry {
  kind: ReceptionKind;
  external_id: string;
  name: string;
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

export function buildSlugSet(entries: readonly ManifestEntry[]): ReadonlySet<string> {
  return new Set(entries.map((entry) => buildInstitutionSlug(entry.kind, entry.external_id)));
}
