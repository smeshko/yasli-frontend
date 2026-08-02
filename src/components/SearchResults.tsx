import { useEffect, useId, useRef, useState } from "react";

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

/* A standing explanation of how nursery admission works — true of every search,
   so printing it above the cards buried the answer the parent came for. It sits
   behind the heading's ПОЯСНЕНИЕ toggle instead. */
const NURSERY_ADMISSION_NOTE =
  "Яслите не са по адрес, имате право да кандидатствате във всяка, но получавате предимство в тези, които са във вашия район.";
/* This one is about the address, not about a group, so it reads once above the
   filters rather than being buried in — and duplicated across — two groups. */
const MISSING_DISTRICT_NOTE =
  "За избрания адрес все още няма потвърден район. Резултатите по район не са налични.";

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
    /* No "Избран адрес" echo: the search field right above still holds the
       address that produced these results, so repeating it only pushed the
       cards further down the page. */
    <section className="results-area" aria-live="polite">
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

          {matchState.address?.district_code === null &&
          visibleResultKinds(filter).some(isDistrictDependentGroup) ? (
            <p className="group-note group-note--warn results-notice">{MISSING_DISTRICT_NOTE}</p>
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
  const showDistrictFallbackNotice =
    kind === "preschool" && groupState?.hasDistrictFallback === true;

  const notes: string[] = kind === "nursery" ? [NURSERY_ADMISSION_NOTE] : [];

  return (
    <section
      className="result-group"
      aria-labelledby={`result-group-${kind}`}
      data-kind={kind}
    >
      <h2 id={`result-group-${kind}`}>
        {labelForReceptionKind(kind)}
        <span className="group-count">{institutions.length}</span>
        {notes.length > 0 ? <GroupInfo kind={kind} notes={notes} /> : null}
      </h2>
      <div className="group-rule" aria-hidden="true"></div>
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
                <span className="result-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="kind-label">{labelForReceptionKind(institution.institution_kind)}</p>
                  <h3>{displayName}</h3>
                  {/* Only the district basis is worth a line. "по вашия адрес"
                      was true of every card in an address search, so it said
                      nothing and cost a row on each one. */}
                  {institution.match_basis === "district" ? (
                    <p className="match-basis">по вашия район</p>
                  ) : null}
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

/* Set as an outlined chip. The underlined-label version put a 2px rule right
   above the group's own 3px rule, and at the far end of the heading the two
   read as one broken line. A chip is the same micro-type but bounded, so it
   resolves as an object next to the count pill — filled pill for the count,
   hollow pill for the aside — instead of competing with the rule.
   The panel is always in the DOM and toggled with `hidden`, so `aria-controls`
   always resolves and the copy stays findable. Dismissal mirrors the address
   autocomplete: outside pointerdown plus Escape. */
function GroupInfo({ kind, notes }: { kind: ReceptionKind; notes: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const panelId = `${useId()}-group-info-${kind}`;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && containerRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span className="group-info" ref={containerRef}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={`Повече за: ${labelForReceptionKind(kind)}`}
        className="group-info-button"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        Пояснение
      </button>
      <span className="group-info-panel" hidden={!isOpen} id={panelId} role="note">
        {notes.map((note) => (
          <span key={note}>{note}</span>
        ))}
      </span>
    </span>
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
