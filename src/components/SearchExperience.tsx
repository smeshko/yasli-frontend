import { useEffect, useMemo, useState } from "react";

import {
  listInstitutions,
  matchAddress,
  type MatchAddressContext,
} from "@/lib/api/client";
import {
  searchExactAddressSuggestions,
  type ExactAddressSuggestion,
} from "@/lib/search/addressSuggestions";
import { clearReferenceDataCache, loadReferenceData } from "@/lib/search/referenceData";
import {
  groupMatchResults,
  newestFreshnessDate,
  shouldShowStaleBanner,
  type GroupedResults,
  type ResultFilter,
} from "@/lib/search/results";

import { ArrowRightIcon, MapPinIcon, SearchIcon } from "./icons";
import { SearchResults } from "./SearchResults";

type ReferenceStatus = "idle" | "loading" | "ready" | "error";
type MatchStatus = "idle" | "loading" | "success" | "error" | "stale";

export interface MatchState {
  status: MatchStatus;
  address: MatchAddressContext | null;
  grouped: GroupedResults | null;
  selectedAddress: ExactAddressSuggestion | null;
  message?: string;
}

const STORAGE_KEY = "yasli:search-state:v2";

interface StoredSearchState {
  query: string;
  filter: ResultFilter;
  matchState: MatchState | null;
}

function loadStoredState(): StoredSearchState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSearchState) : null;
  } catch {
    return null;
  }
}

function saveStoredState(state: StoredSearchState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* sessionStorage unavailable or quota exceeded — drop silently */
  }
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
    address: null,
    grouped: null,
    selectedAddress: null,
  });
  const [hasHydrated, setHasHydrated] = useState(false);

  const visibleSuggestions = useMemo(
    () => searchExactAddressSuggestions(suggestions, query),
    [query, suggestions],
  );
  const hasQuery = query.trim().length > 0;
  const showNoMatches =
    referenceStatus === "ready" && hasQuery && isAutocompleteOpen && visibleSuggestions.length === 0;
  const staleResults = shouldShowStaleBanner(freshnessDate);

  useEffect(() => {
    const stored = loadStoredState();

    if (stored) {
      setQuery(stored.query);
      setFilter(stored.filter);

      if (stored.matchState && stored.matchState.status !== "loading") {
        setMatchState(stored.matchState);
      }
    }

    setHasHydrated(true);
    void loadReferences();
    void loadFreshness();
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const persistableMatch = matchState.status === "loading" ? null : matchState;
    saveStoredState({ query, filter, matchState: persistableMatch });
  }, [hasHydrated, query, filter, matchState]);

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
      address: null,
      grouped: null,
      selectedAddress: suggestion,
    });

    let result;
    try {
      result = await matchAddress(suggestion.addressId);
    } catch {
      setMatchState({
        status: "error",
        address: null,
        grouped: null,
        selectedAddress: suggestion,
        message: "Не успяхме да заредим резултатите. Опитайте отново.",
      });
      return;
    }

    if (result.ok) {
      setMatchState({
        status: "success",
        address: result.data.address,
        grouped: groupMatchResults(result.data.results),
        selectedAddress: suggestion,
      });
      return;
    }

    if (result.error.code === "address_not_found") {
      clearReferenceDataCache();
      setMatchState({
        status: "stale",
        address: null,
        grouped: null,
        selectedAddress: suggestion,
        message: "Данните за избрания адрес са обновени. Презаредете списъка и опитайте отново.",
      });
      return;
    }

    setMatchState({
      status: "error",
      address: null,
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
          {/* Split so `моята` can take the italic display face and `градина`
              the printed underline. The words and their order are unchanged. */}
          <h1 id="search-title">
            Коя е <em>моята</em> <span className="headline-mark">градина</span>?
          </h1>
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
              placeholder="ул. Преслав 12"
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
                  data-active={index === activeIndex ? "" : undefined}
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

          {freshnessDate ? (
            <p className="freshness-line">Last updated: {formatDate(freshnessDate)}</p>
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
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
