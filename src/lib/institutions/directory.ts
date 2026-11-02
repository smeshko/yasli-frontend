import type { InstitutionListItem } from "../api/client";
import { institutionNameCollator } from "../domain/institutionName";
import { labelForReceptionKind, receptionKindOrder, type ReceptionKind } from "../domain/kinds";
import { buildInstitutionSlug, institutionPath } from "./manifest";

export interface DirectoryRow {
  key: string;
  name: string;
  href: string | null;
  hasInfantGroup: boolean;
}

export interface DirectoryGroup {
  kind: ReceptionKind;
  label: string;
  rows: DirectoryRow[];
}

export function buildDirectoryGroups(
  items: readonly InstitutionListItem[],
  pageSlugs: ReadonlySet<string>,
): DirectoryGroup[] {
  const groups: DirectoryGroup[] = [];

  for (const kind of receptionKindOrder) {
    const rows = items
      .filter((item) => item.kind === kind)
      .sort((first, second) => institutionNameCollator.compare(first.name, second.name))
      .map((item): DirectoryRow => ({
        key: buildInstitutionSlug(kind, item.external_id),
        name: item.name,
        href: pageSlugs.has(buildInstitutionSlug(kind, item.external_id))
          ? institutionPath(kind, item.external_id)
          : null,
        hasInfantGroup: item.has_infant_group,
      }));

    if (rows.length > 0) {
      groups.push({ kind, label: labelForReceptionKind(kind), rows });
    }
  }

  return groups;
}
