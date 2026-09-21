import type { MapTheme } from "./style";

/* The one place that knows how the site's theme is expressed at runtime.
   src/components/ThemeToggle.astro writes document.documentElement.dataset.theme
   for an explicit light/dark choice and *deletes* the attribute for "system",
   and it emits no event — so following the theme is observation, not a
   subscription. If ThemeToggle ever changes how it records the choice, this
   file is the only one that has to keep step. Same treatment as
   src/lib/search/storedSearch.ts and BaseLayout's pre-paint script. */

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function currentMapTheme(): MapTheme {
  if (typeof document === "undefined") {
    return "light";
  }

  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") {
    return explicit;
  }

  return prefersDark() ? "dark" : "light";
}

/**
 * Call `onChange` whenever the effective theme changes — either because the
 * toggle set or cleared `data-theme`, or because the system preference moved
 * while no explicit choice is stored. Returns an unsubscribe.
 */
export function observeMapTheme(onChange: (theme: MapTheme) => void): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  let last = currentMapTheme();

  const notifyIfChanged = () => {
    const next = currentMapTheme();
    if (next !== last) {
      last = next;
      onChange(next);
    }
  };

  const observer = new MutationObserver(notifyIfChanged);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const media = window.matchMedia?.(DARK_QUERY);
  media?.addEventListener("change", notifyIfChanged);

  return () => {
    observer.disconnect();
    media?.removeEventListener("change", notifyIfChanged);
  };
}

/** True when the OS asks for less motion — the map then never animates. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function prefersDark(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia?.(DARK_QUERY).matches ?? false;
}
