export interface ProfileLoaderOptions<T> {
  /** Must not reject — `getInstitutionBySource` encodes failure in its result. */
  fetch: () => Promise<T>;
  /** Called synchronously at the start of every `load()`, before the await. */
  onStart: () => void;
  /** Called only for the newest `load()` still in flight. */
  onResult: (result: T) => void;
}

export interface ProfileLoader {
  load: () => Promise<void>;
}

/**
 * Serialises repeated loads of one institution profile so only the newest
 * request can reach state.
 *
 * The retry button lives in the error block, and `onStart` moves the island to
 * its loading state synchronously — the block and its button unmount, so a
 * double click cannot start two requests. A request already in flight can
 * still complete *after* a newer one (a slow first attempt landing after a
 * fast retry), and that completion would otherwise overwrite a fresher result
 * with a stale one. The generation counter drops it.
 *
 * Framework-free on purpose: the island wires it through `useMemo`, and the
 * out-of-order case is unit-tested with promises whose settlement order the
 * test controls. Effects never run under `renderToStaticMarkup`, so this could
 * not be covered through the component.
 */
export function createProfileLoader<T>({
  fetch,
  onStart,
  onResult,
}: ProfileLoaderOptions<T>): ProfileLoader {
  let latestGeneration = 0;

  return {
    async load() {
      onStart();

      latestGeneration += 1;
      const generation = latestGeneration;

      const result = await fetch();

      if (generation === latestGeneration) {
        onResult(result);
      }
    },
  };
}
