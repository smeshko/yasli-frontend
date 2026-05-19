import type { MatchAddressContext } from "@/lib/api/client";
import { STALE_BANNER_THRESHOLD_DAYS } from "@/lib/domain/freshness";
import { labelForReceptionKind, receptionKindOrder, type ReceptionKind } from "@/lib/domain/kinds";
import {
  deriveResultGroupState,
  visibleResultKinds,
  type GroupedInstitution,
  type ResultFilter,
} from "@/lib/search/results";

import type { MatchState } from "./SearchExperience";

const FILTER_TABS: ReadonlyArray<{ value: ResultFilter; label: string }> = [
  { value: "all", label: "Всички" },
  ...receptionKindOrder.map((kind) => ({ value: kind, label: labelForReceptionKind(kind) })),
];

interface SearchResultsProps {
  filter: ResultFilter;
  matchState: MatchState;
  staleResults: boolean;
  onFilterChange: (filter: ResultFilter) => void;
  onRetryStale: () => void;
}

export function SearchResults({
  filter,
  matchState,
  staleResults,
  onFilterChange,
  onRetryStale,
}: SearchResultsProps) {
  if (matchState.status === "idle") {
    return null;
  }

  return (
    <section className="results-area" aria-live="polite">
      {matchState.selectedAddress ? (
        <p className="selected-address">Избран адрес: {matchState.selectedAddress.label}</p>
      ) : null}

      {matchState.status === "loading" ? <div className="results-status">Търсим институции...</div> : null}

      {matchState.status === "error" ? (
        <div className="results-status error">{matchState.message}</div>
      ) : null}

      {matchState.status === "stale" ? (
        <div className="results-status error">
          <span>{matchState.message}</span>
          <button type="button" onClick={onRetryStale}>
            Презареди адресите
          </button>
        </div>
      ) : null}

      {matchState.status === "success" && matchState.grouped ? (
        <>
          {staleResults ? (
            <div className="stale-banner">
              Данните са по-стари от {STALE_BANNER_THRESHOLD_DAYS} дни. Проверете и официалния източник преди кандидатстване.
            </div>
          ) : null}

          <FilterTabs currentFilter={filter} onFilterChange={onFilterChange} />

          <div className="result-groups">
            {visibleResultKinds(filter).map((kind) => (
              <ResultGroup
                key={kind}
                kind={kind}
                institutions={matchState.grouped?.[kind] ?? []}
                address={matchState.address}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function FilterTabs({
  currentFilter,
  onFilterChange,
}: {
  currentFilter: ResultFilter;
  onFilterChange: (filter: ResultFilter) => void;
}) {
  return (
    <div className="filters" aria-label="Филтър по тип">
      {FILTER_TABS.map((item) => (
        <button
          key={item.value}
          type="button"
          className={item.value === currentFilter ? "active" : undefined}
          onClick={() => onFilterChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ResultGroup({
  kind,
  institutions,
  address,
}: {
  kind: ReceptionKind;
  institutions: GroupedInstitution[];
  address: MatchAddressContext | null;
}) {
  const groupState = address ? deriveResultGroupState(address, institutions) : null;
  const showMissingDistrictNotice =
    groupState?.hasMissingDistrictContext === true && isDistrictDependentGroup(kind);
  const showDistrictFallbackNotice =
    kind === "preschool" && groupState?.hasDistrictFallback === true;

  return (
    <section className="result-group" aria-labelledby={`result-group-${kind}`}>
      <h2 id={`result-group-${kind}`}>{labelForReceptionKind(kind)}</h2>
      {kind === "nursery" ? (
        <p className="group-note">
          Яслите не са по адрес, имате право да кандидатствате във всяка, но получавате
          предимство в тези, които са във вашия район.
        </p>
      ) : null}
      {showMissingDistrictNotice ? (
        <p className="group-note group-note--warn">
          За избрания адрес все още няма потвърден район. Районните резултати за тази група
          не са налични.
        </p>
      ) : null}
      {showDistrictFallbackNotice ? (
        <p className="group-note group-note--warn">
          Няма адресно съвпадение за тази група. Показваме резултати по район.
        </p>
      ) : null}
      {institutions.length > 0 ? (
        <div className="cards">
          {institutions.map((institution, index) => {
            const displayName = institution.offering === "infant_group"
              ? `${institution.name} (яслена група)`
              : institution.name;
            return (
              <article
                className="result-card"
                key={`${kind}-${institution.institution_kind}-${institution.offering}-${institution.id}`}
                style={{ "--result-delay": `${index * 40}ms` } as React.CSSProperties}
              >
                <div>
                  <p className="kind-label">{labelForReceptionKind(institution.institution_kind)}</p>
                  <h3>{displayName}</h3>
                </div>
                <div className="card-actions">
                  <a href={institution.source_url} target="_blank" rel="noreferrer">
                    Източник <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-group">{emptyGroupText(kind)}</p>
      )}
    </section>
  );
}

function isDistrictDependentGroup(kind: ReceptionKind): boolean {
  return kind === "nursery" || kind === "preschool";
}

function emptyGroupText(kind: ReceptionKind): string {
  if (kind === "nursery") {
    return "Няма ясла за този адрес в източника. Покритието за ясли е непълно и това може да е реална липса на данни.";
  }

  if (kind === "kindergarten") {
    return "Няма детска градина за този адрес.";
  }

  return "Няма подготвителна група за този адрес.";
}
