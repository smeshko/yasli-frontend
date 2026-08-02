import { useEffect, useMemo, useRef, useState } from "react";

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

import { ArrowRightIcon, ClearIcon, MapPinIcon, SearchIcon } from "./icons";
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
  /* Latched rather than derived from the results. Editing the address drops
     the results on the keystroke (they belong to the address that was picked,
     not to the text) — and if the compact hero were tied to those, deleting a
     single character sprang the headline back and shoved the field halfway
     down the page mid-edit. The latch only lifts when the field is emptied,
     which is the one moment that is genuinely a fresh start. */
  const [hasSearched, setHasSearched] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  /* The pre-paint hint BaseLayout put on <html> has done its job by now: this
     runs in the same commit that first renders data-compact, so the hero never
     loses its compact padding between the two. It has to come off — left up,
     it would pin the hero compact after the field is cleared. */
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    delete document.documentElement.dataset.restoringResults;
  }, [hasHydrated]);

  useEffect(() => {
    if (matchState.status !== "idle") {
      setHasSearched(true);
    }
  }, [matchState.status]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, visibleSuggestions.length]);

  /* The date is fetched here because the stale banner is decided from it, but
     it reads as a footnote about the dataset rather than as part of the search
     — so it renders in the site footer, which Astro owns outside this island.
     Handing it over through the footer's placeholder node keeps it to the one
     /api/institutions call. */
  useEffect(() => {
    const slots = document.querySelectorAll<HTMLElement>("[data-footer-freshness]");

    slots.forEach((slot) => {
      slot.textContent = freshnessDate ? `Last updated: ${formatDate(freshnessDate)}` : "";
      slot.hidden = freshnessDate === null;
    });
  }, [freshnessDate]);

  /* Tapping anywhere off the field dismisses the list; focusing the input
     brings it back (onFocus). pointerdown rather than click so the list goes
     away on press, and capture so it still fires when a handler deeper in the
     page stops propagation. */
  useEffect(() => {
    if (!isAutocompleteOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && anchorRef.current?.contains(target)) {
        return;
      }

      setIsAutocompleteOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isAutocompleteOpen]);

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

  /* Same path as typing the field empty, so the hero, the results and the
     latch all reset together. Focus goes back to the input: the button is
     about to unmount, and a phone keyboard staying up is the point. */
  function clearQuery() {
    handleQueryChange("");
    inputRef.current?.focus();
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

    if (value.trim() === "") {
      setHasSearched(false);
    }

    /* Results belong to the address that was picked from the list, not to
       whatever is in the field. Once the two stop agreeing — cleared, or
       edited towards a different address — the cards below are answering a
       question nobody is asking any more, so they go with the text rather
       than sitting under it looking current. */
    setMatchState((current) => {
      if (current.status === "idle" || value.trim() === current.selectedAddress?.label) {
        return current;
      }

      return { status: "idle", address: null, grouped: null, selectedAddress: null };
    });
  }

  const inputDescriptionId = validationMessage ? "search-validation" : undefined;

  return (
    <div className="search-experience" data-compact={hasSearched ? "true" : undefined}>
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
          <div className="search-field-anchor" ref={anchorRef}>
            <div className="search-field">
              <SearchIcon />
              <input
                ref={inputRef}
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
              {/* Ours, not WebKit's: the native type="search" clear button is
                  desktop-only, so on a phone — where retyping a long address
                  is worst — there was nothing to clear with. */}
              {hasQuery ? (
                <button
                  aria-label="Изчисти адреса"
                  className="clear-button"
                  type="button"
                  onClick={clearQuery}
                >
                  <ClearIcon />
                </button>
              ) : null}
            </div>

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
          </div>

          {/* Reference-load states stay in normal flow rather than in the
              overlay: they are not suggestions, they outlive a blur, and the
              error carries the only retry affordance. */}
          {referenceStatus === "loading" ? (
            <div className="suggestion-panel status-panel status-panel--inline">
              Зареждаме адресите...
            </div>
          ) : null}

          {referenceStatus === "error" ? (
            <div className="suggestion-panel status-panel status-panel--inline">
              <span>Не успяхме да заредим адресите.</span>
              <button type="button" onClick={() => void retryReferences()}>
                Опитайте пак
              </button>
            </div>
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
