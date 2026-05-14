import { useEffect, useMemo, useState } from "react";

import { listInstitutions, matchAddress, type MatchInstitution } from "@/lib/api/client";
import { labelForReceptionKind, receptionKindOrder, type ReceptionKind } from "@/lib/domain/kinds";
import {
  searchExactAddressSuggestions,
  type ExactAddressSuggestion,
} from "@/lib/search/addressSuggestions";
import { clearReferenceDataCache, loadReferenceData } from "@/lib/search/referenceData";
import {
  groupMatchResults,
  newestFreshnessDate,
  shouldShowStaleBanner,
  visibleResultKinds,
  type GroupedResults,
  type ResultFilter,
} from "@/lib/search/results";

type ReferenceStatus = "idle" | "loading" | "ready" | "error";
type MatchStatus = "idle" | "loading" | "success" | "error" | "stale";

export interface MatchState {
  status: MatchStatus;
  grouped: GroupedResults | null;
  selectedAddress: ExactAddressSuggestion | null;
  districtUnknown?: boolean;
  message?: string;
}

export function SearchExperience() {
  const [referenceStatus, setReferenceStatus] = useState<ReferenceStatus>("idle");
  const [suggestions, setSuggestions] = useState<ExactAddressSuggestion[]>([]);
  const [query, setQuery] = useState("");
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [freshnessDate, setFreshnessDate] = useState<Date | null>(null);
  const [matchState, setMatchState] = useState<MatchState>({
    status: "idle",
    grouped: null,
    selectedAddress: null,
  });

  const visibleSuggestions = useMemo(
    () => searchExactAddressSuggestions(suggestions, query),
    [query, suggestions],
  );
  const hasQuery = query.trim().length > 0;
  const showNoMatches =
    referenceStatus === "ready" && hasQuery && isAutocompleteOpen && visibleSuggestions.length === 0;
  const staleResults = shouldShowStaleBanner(freshnessDate);

  useEffect(() => {
    void loadReferences();
    void loadFreshness();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, visibleSuggestions.length]);

  async function loadReferences() {
    setReferenceStatus("loading");

    try {
      const data = await loadReferenceData();
      setSuggestions(data.suggestions);
      setReferenceStatus("ready");
    } catch {
      setReferenceStatus("error");
    }
  }

  async function retryReferences() {
    clearReferenceDataCache();
    await loadReferences();
  }

  async function loadFreshness() {
    const result = await listInstitutions();

    if (result.ok) {
      setFreshnessDate(newestFreshnessDate(result.data));
    }
  }

  async function selectSuggestion(suggestion: ExactAddressSuggestion) {
    setQuery(suggestion.label);
    setValidationMessage(null);
    setIsAutocompleteOpen(false);
    setFilter("all");
    setMatchState({
      status: "loading",
      grouped: null,
      selectedAddress: suggestion,
    });

    let result;
    try {
      result = await matchAddress(suggestion.addressId);
    } catch {
      setMatchState({
        status: "error",
        grouped: null,
        selectedAddress: suggestion,
        message: "Не успяхме да заредим резултатите. Опитайте отново.",
      });
      return;
    }

    if (result.ok) {
      setMatchState({
        status: "success",
        grouped: groupMatchResults(result.data.institutions),
        selectedAddress: suggestion,
        districtUnknown: result.data.districtUnknown,
      });
      return;
    }

    if (result.error.code === "address_not_found") {
      clearReferenceDataCache();
      setMatchState({
        status: "stale",
        grouped: null,
        selectedAddress: suggestion,
        message: "Данните за избрания адрес са обновени. Презаредете списъка и опитайте отново.",
      });
      return;
    }

    setMatchState({
      status: "error",
      grouped: null,
      selectedAddress: suggestion,
      message: "Не успяхме да заредим резултатите. Опитайте отново.",
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isAutocompleteOpen && event.key !== "Enter") {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(visibleSuggestions.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Escape") {
      setIsAutocompleteOpen(false);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const activeSuggestion = visibleSuggestions[activeIndex];

      if (activeSuggestion) {
        void selectSuggestion(activeSuggestion);
        return;
      }

      setValidationMessage("Изберете точен адрес от списъка, за да започне търсенето.");
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setValidationMessage(null);
    setIsAutocompleteOpen(true);
  }

  const inputDescriptionId = validationMessage ? "search-validation" : undefined;
  const hasResults = matchState.status !== "idle";

  return (
    <div className="search-experience" data-has-results={hasResults ? "true" : undefined}>
      <section className="search-hero" aria-labelledby="search-title">
        <div className="search-copy">
          <h1 id="search-title">Коя е моята градина?</h1>
          <p>Въведете адреса си в полето и ще видите списък на всички детски градини и ясли, за които можете да кандидатствате</p>
        </div>

        <div className="search-panel">
          <label className="sr-only" htmlFor="address-search">
            Адрес във Варна
          </label>
          <div className="search-field">
            <SearchIcon />
            <input
              id="address-search"
              type="search"
              autoComplete="off"
              value={query}
              placeholder="бул. Генерал Колев 85"
              aria-autocomplete="list"
              aria-controls="address-suggestions"
              aria-expanded={isAutocompleteOpen}
              aria-describedby={inputDescriptionId}
              onChange={(event) => handleQueryChange(event.currentTarget.value)}
              onFocus={() => setIsAutocompleteOpen(true)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {referenceStatus === "loading" ? (
            <div className="suggestion-panel status-panel">Зареждаме адресите...</div>
          ) : null}

          {referenceStatus === "error" ? (
            <div className="suggestion-panel status-panel">
              <span>Не успяхме да заредим адресите.</span>
              <button type="button" onClick={() => void retryReferences()}>
                Опитайте пак
              </button>
            </div>
          ) : null}

          {referenceStatus === "ready" && isAutocompleteOpen && visibleSuggestions.length > 0 ? (
            <ul className="suggestion-panel" id="address-suggestions" role="listbox">
              {visibleSuggestions.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? "active" : undefined}
                  role="option"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    void selectSuggestion(suggestion);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <MapPinIcon />
                  <span className="suggestion-text">
                    <strong>{suggestion.label}</strong>
                    <span>{suggestion.context}</span>
                  </span>
                  <ArrowRightIcon />
                </li>
              ))}
            </ul>
          ) : null}

          {showNoMatches ? (
            <div className="suggestion-panel status-panel">Няма точен адрес за това търсене.</div>
          ) : null}

          {validationMessage ? (
            <p className="validation-message" id="search-validation">
              {validationMessage}
            </p>
          ) : null}
        </div>
      </section>

      <SearchResults
        filter={filter}
        matchState={matchState}
        staleResults={staleResults}
        onFilterChange={setFilter}
        onRetryStale={() => void retryReferences()}
      />

      <FooterFreshness freshnessDate={freshnessDate} />
    </div>
  );
}

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
              Данните са по-стари от 14 дни. Проверете и официалния източник преди кандидатстване.
            </div>
          ) : null}

          {matchState.districtUnknown ? (
            <div className="results-status">
              Районът за този адрес още не е зареден. Показваме само детските градини по адрес; яслите и
              подготвителните групи изискват потвърден район.
            </div>
          ) : null}

          <FilterTabs currentFilter={filter} onFilterChange={onFilterChange} />

          <div className="result-groups">
            {visibleResultKinds(filter).map((kind) => (
              <ResultGroup key={kind} kind={kind} institutions={matchState.grouped?.[kind] ?? []} />
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
  const filters: Array<{ value: ResultFilter; label: string }> = [
    { value: "all", label: "Всички" },
    ...receptionKindOrder.map((kind) => ({ value: kind, label: labelForReceptionKind(kind) })),
  ];

  return (
    <div className="filters" aria-label="Филтър по тип">
      {filters.map((item) => (
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
}: {
  kind: ReceptionKind;
  institutions: MatchInstitution[];
}) {
  return (
    <section className="result-group" aria-labelledby={`result-group-${kind}`}>
      <h2 id={`result-group-${kind}`}>{labelForReceptionKind(kind)}</h2>
      {institutions.length > 0 ? (
        <div className="cards">
          {institutions.map((institution, index) => (
            <article
              className="result-card"
              key={`${institution.kind}-${institution.id}`}
              style={{ "--result-delay": `${index * 40}ms` } as React.CSSProperties}
            >
              <div>
                <p className="kind-label">{labelForReceptionKind(institution.kind)}</p>
                <h3>{institution.name}</h3>
              </div>
              <div className="card-actions">
                <a href={institution.source_url} target="_blank" rel="noreferrer">
                  Източник <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-group">{emptyGroupText(kind)}</p>
      )}
    </section>
  );
}

function FooterFreshness({ freshnessDate }: { freshnessDate: Date | null }) {
  return (
    <footer className="home-footer">
      {freshnessDate ? <span>Last updated: {formatDate(freshnessDate)}</span> : <span>Last updated: --</span>}
      <span aria-hidden="true">|</span>
      <a href="https://ivotsonev.com" target="_blank" rel="noreferrer">
        Built by ivotsonev.com
      </a>
    </footer>
  );
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="field-icon" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path
        d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg aria-hidden="true" className="row-icon" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12 12.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" className="arrow-icon" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
