import { useEffect, useMemo, useRef, useState } from "react";

import mapStylesheetUrl from "maplibre-gl/dist/maplibre-gl.css?url";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import type { InstitutionBranch, InstitutionLocation } from "@/lib/api/client";
import { fitBoundsFor, toPins, type MapPin, type MapView } from "@/lib/map/pins";
import { bulgarianLabelStyle, styleUrlForTheme, type MapStyle } from "@/lib/map/style";
import { currentMapTheme, observeMapTheme, prefersReducedMotion } from "@/lib/map/theme";

const COPY = {
  regionLabel: "Карта на сградите",
} as const;

/* Varna's buildings sit close together, so a lone pin opens tight. */
const SINGLE_PIN_ZOOM = 16;
const FIT_PADDING = 56;
const FIT_MAX_ZOOM = 17;
/* Start fetching a little before the container is actually on screen, so the
   map is drawn by the time it arrives rather than after. */
const PREFETCH_MARGIN = "200px";
/* A style host that neither answers nor errors still means no map. */
const STYLE_TIMEOUT_MS = 12_000;

export interface InstitutionMapProps {
  location: InstitutionLocation | null;
  branches: readonly InstitutionBranch[];
  name: string;
}

/**
 * The institution's buildings on an OpenFreeMap base map.
 *
 * MapLibre is reached only through a dynamic import fired from an
 * IntersectionObserver, so ~200 KB of map code is requested when — and only
 * when — the container scrolls into view, and never on the search screen.
 *
 * Every way this can fail has the same outcome: no container. No coordinate,
 * no IntersectionObserver, no WebGL, a failed import and a style that will not
 * load are all designed absences rather than errors. Nothing on the page says
 * the map failed, because a parent who cannot see a map is not helped by being
 * told so — the address and the link-outs above it are still there.
 */
export function InstitutionMap({ location, branches, name }: InstitutionMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  /* Starts true and only ever goes false. The server and the first client
     render must agree — the rule this page has followed since 1.1 — so the
     container is always rendered up front and removed later if it cannot be
     drawn. */
  const [canDraw, setCanDraw] = useState(true);

  const pins = useMemo(() => toPins(location, branches), [location, branches]);
  /* The parent hands a fresh `branches` array on every render, so the effect
     keys off what the map actually depends on: the coordinates themselves. */
  const pinsKey = pins.map((pin) => `${pin.kind}:${pin.lat},${pin.lon}`).join("|");

  useEffect(() => {
    const container = containerRef.current;
    const view = fitBoundsFor(pins);

    if (!container || !view || typeof IntersectionObserver === "undefined") {
      setCanDraw(false);
      return;
    }

    let disposed = false;
    let teardown: (() => void) | null = null;

    /* The single place the "cannot draw" decision is taken, so the
       no-observer, no-WebGL, failed-import and failed-style cases visibly
       share one outcome instead of each unmounting in their own way. */
    const giveUp = () => {
      if (!disposed) {
        setCanDraw(false);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        observer.disconnect();
        drawMap(container, pins, view, name, giveUp)
          .then((dispose) => {
            if (disposed) {
              dispose?.();
            } else if (dispose) {
              teardown = dispose;
            } else {
              giveUp();
            }
          })
          .catch(giveUp);
      },
      { rootMargin: PREFETCH_MARGIN },
    );

    observer.observe(container);

    return () => {
      disposed = true;
      observer.disconnect();
      teardown?.();
    };
    /* pinsKey stands in for pins, which the parent rebuilds on every render:
       it is derived from every pin's coordinates, so the same key means the
       same map and there is nothing stale to close over. */
  }, [pinsKey, name]);

  if (!location || !canDraw) {
    return null;
  }

  return (
    /* A labelled region, so the map is announced and skippable, with nothing
       focusable inside it — the "Филиали" list below carries every label and
       address a popup would have shown. */
    <section className="profile-map" aria-label={COPY.regionLabel}>
      <div className="profile-map-canvas" ref={containerRef} />
    </section>
  );
}

/**
 * Load MapLibre, draw the pins and follow the theme. Resolves to a teardown,
 * or to `null` when the map cannot be drawn at all.
 */
async function drawMap(
  container: HTMLDivElement,
  pins: readonly MapPin[],
  view: MapView,
  name: string,
  onFail: () => void,
): Promise<(() => void) | null> {
  /* The one reference to maplibre-gl in the codebase, and it is dynamic: this
     is what keeps the bundle out of the initial payload and off every other
     route. Its stylesheet rides along in the same chunk. */
  const maplibre = await import("maplibre-gl");
  await loadMapStylesheet();

  /* MapLibre resolves its tile-parsing worker as a sibling of its own module
     URL — `new URL("./maplibre-gl-worker.mjs", import.meta.url)` — which after
     bundling points at a path next to the chunk that Vite never emits. The
     request fails, no worker starts, and the map renders as blank grey with
     the pins still on it and not one error anywhere. `?worker&url` has Vite
     bundle the worker with its own dependencies and hand back the address it
     actually lands at, which is then what MapLibre spawns. */
  maplibre.setWorkerUrl(workerUrl);

  const reducedMotion = prefersReducedMotion();
  let markers: InstanceType<typeof maplibre.Marker>[] = [];
  let map: InstanceType<typeof maplibre.Map>;

  try {
    map = new maplibre.Map({
      container,
      style: styleUrlForTheme(currentMapTheme()),
      /* Attribution is never configured away: OpenFreeMap's TileJSON carries
         it, MapLibre's default control renders it, and `compact: false` keeps
         it visible rather than collapsed behind an "i". */
      attributionControl: { compact: false },
      /* No keyboard camera control: the map is a picture of where the
         buildings are, not something to operate, and this keeps the canvas
         out of the tab order. */
      keyboard: false,
      ...(view.mode === "center"
        ? { center: view.center, zoom: SINGLE_PIN_ZOOM }
        : {
            bounds: view.bounds,
            fitBoundsOptions: {
              padding: FIT_PADDING,
              maxZoom: FIT_MAX_ZOOM,
              /* The opening camera never animates under reduced motion, and
                 no other camera move is ever issued programmatically. */
              animate: !reducedMotion,
            },
          }),
    });
  } catch {
    /* No WebGL. Nothing to tear down — the constructor never returned. */
    return null;
  }

  /* Setting a style resets the map's sources, so the label patch and the pins
     are one function, run as soon as a style is ready and again after every
     swap.

     Deliberately not gated on the `load` event: `load` waits for every tile of
     the opening view as well as the style, and at building zoom over Varna it
     can simply never arrive — measured 2026-09-21, where `styledata` fired
     three times and `load` not at all. A ready style is all this needs. */
  const applyStyleAndPins = () => {
    const style = map.getStyle() as unknown as MapStyle | undefined;
    if (!style) {
      return;
    }

    /* Applied layer by layer with setLayoutProperty rather than by handing the
       patched object back to setStyle: re-setting a whole style replaces its
       sources too, and the round trip through getStyle leaves the map with
       sources it never fetches tiles for — measured 2026-09-21, a blank grey
       map with the pins still on it. */
    const { style: patched } = bulgarianLabelStyle(style);
    patched.layers.forEach((layer, index) => {
      const next = layer.layout?.["text-field"];
      if (next != null && next !== style.layers[index].layout?.["text-field"]) {
        map.setLayoutProperty(layer.id, "text-field", next as never);
      }
    });

    for (const marker of markers) {
      marker.remove();
    }
    markers = pins.map((pin) =>
      new maplibre.Marker({ element: pinElement(pin, name) })
        .setLngLat([pin.lon, pin.lat])
        .addTo(map),
    );

    /* Belt and braces against a focus trap: MapLibre puts the canvas in the
       tab order even with `keyboard: false`, and there is nothing inside it to
       operate. Re-done after each style swap, which rebuilds the canvas. */
    map.getCanvas().removeAttribute("tabindex");
  };

  let styleReady = false;
  const onStyleData = () => {
    styleReady = true;
    applyStyleAndPins();
  };

  map.on("styledata", onStyleData);
  if (map.isStyleLoaded()) {
    onStyleData();
  }

  map.on("error", () => {
    /* An error before any style has arrived means there is no map to show —
       the same designed absence as no WebGL. Afterwards MapLibre reports
       ordinary things like a tile that would not load, which is not a reason
       to take the map away. */
    if (!styleReady) {
      onFail();
    }
  });

  /* A style that neither loads nor errors — a blocked or hanging host — is
     still an absent map, not a spinner. */
  const styleTimer = window.setTimeout(() => {
    if (!styleReady) {
      onFail();
    }
  }, STYLE_TIMEOUT_MS);

  const unobserveTheme = observeMapTheme((theme) => {
    styleReady = false;
    map.setStyle(styleUrlForTheme(theme));
  });

  return () => {
    window.clearTimeout(styleTimer);
    unobserveTheme();
    for (const marker of markers) {
      marker.remove();
    }
    map.remove();
  };
}

/* MapLibre's stylesheet is 83 KB and is linked into the page head if it is
   imported as a module — eager weight on a route whose map may never be
   scrolled to. Fetched as an ordinary stylesheet here instead, once, at the
   moment the map is drawn. */
function loadMapStylesheet(): Promise<void> {
  const existing = document.head.querySelector(`link[href="${mapStylesheetUrl}"]`);
  if (existing) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = mapStylesheetUrl;
    /* Resolve either way: without its stylesheet the map still draws, just
       with MapLibre's controls unstyled, which beats no map at all. */
    link.addEventListener("load", () => resolve());
    link.addEventListener("error", () => resolve());
    document.head.append(link);
  });
}

/* DOM markers rather than a GeoJSON symbol layer: they read the page's CSS
   tokens directly, so they inherit the kind hue from the article's data-kind
   and stay right in both themes without a second palette — and they are not
   part of the style, which a theme swap resets. */
function pinElement(pin: MapPin, name: string): HTMLElement {
  const element = document.createElement("span");
  element.className = pin.kind === "main" ? "profile-map-pin is-main" : "profile-map-pin";
  /* Hidden from assistive tech and unreachable by keyboard on purpose: no
     popup, no click handler, nothing to focus. The branch list carries the
     text (DECISIONS.md 4). */
  element.setAttribute("aria-hidden", "true");
  element.title = name;
  return element;
}
