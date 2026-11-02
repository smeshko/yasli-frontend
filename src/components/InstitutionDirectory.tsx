import { useEffect, useMemo, useState } from "react";

import institutionSlugs from "@/data/institution-slugs.json";
import { listInstitutions } from "@/lib/api/client";
import { INFANT_GROUP_LABEL } from "@/lib/domain/kinds";
import { buildDirectoryGroups, type DirectoryGroup } from "@/lib/institutions/directory";
import { createProfileLoader } from "@/lib/institutions/profileLoader";

export type DirectoryStatus = "loading" | "success" | "error";

const COPY = {
  loading: "Зареждаме списъка с институции…",
  error: "Не успяхме да заредим списъка с институции.",
  retry: "Опитайте отново",
  empty: "Няма публикувани институции.",
};

const INSTITUTION_PAGE_SLUGS = new Set<string>(institutionSlugs);

export interface InstitutionDirectoryViewProps {
  status: DirectoryStatus;
  groups: DirectoryGroup[];
  onRetry: () => void;
}

export function InstitutionDirectoryView({ status, groups, onRetry }: InstitutionDirectoryViewProps) {
  if (status === "loading") {
    return (
      <p className="directory-status" role="status">
        {COPY.loading}
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="directory-status directory-status--error" role="alert">
        <span>{COPY.error}</span>
        <button type="button" onClick={onRetry}>
          {COPY.retry}
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return <p className="directory-status">{COPY.empty}</p>;
  }

  return (
    <div className="directory-groups">
      {groups.map(({ kind, label, rows }) => (
        <section
          key={kind}
          className="directory-group"
          data-kind={kind}
          aria-labelledby={`directory-group-${kind}`}
        >
          <h2 id={`directory-group-${kind}`}>
            {label}
            <span className="group-count">{rows.length}</span>
          </h2>
          <ul className="directory-list">
            {rows.map((row) => (
              <li key={row.key}>
                {row.href ? (
                  <a className="directory-link" href={row.href}>
                    {row.name}
                  </a>
                ) : (
                  <span>{row.name}</span>
                )}
                {row.hasInfantGroup ? (
                  <span className="directory-tag">{INFANT_GROUP_LABEL}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function InstitutionDirectory() {
  const [status, setStatus] = useState<DirectoryStatus>("loading");
  const [groups, setGroups] = useState<DirectoryGroup[]>([]);

  const loader = useMemo(
    () =>
      createProfileLoader({
        fetch: listInstitutions,
        onStart: () => setStatus("loading"),
        onResult: (result) => {
          if (result.ok) {
            setGroups(buildDirectoryGroups(result.data, INSTITUTION_PAGE_SLUGS));
            setStatus("success");
            return;
          }

          setGroups([]);
          setStatus("error");
        },
      }),
    [],
  );

  useEffect(() => {
    void loader.load();
  }, [loader]);

  return <InstitutionDirectoryView status={status} groups={groups} onRetry={() => void loader.load()} />;
}
