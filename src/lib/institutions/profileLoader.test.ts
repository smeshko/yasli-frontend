import { describe, expect, it, vi } from "vitest";

import { createProfileLoader } from "./profileLoader";

/* Two promises whose settlement order the test controls, so the out-of-order
   case is deterministic rather than a race. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("createProfileLoader", () => {
  it("forwards the result of a single load", async () => {
    const onStart = vi.fn();
    const onResult = vi.fn();
    const loader = createProfileLoader({
      fetch: () => Promise.resolve("only"),
      onStart,
      onResult,
    });

    await loader.load();

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledExactlyOnceWith("only");
  });

  it("drops a stale completion that lands after a newer one", async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const fetches = [first.promise, second.promise];
    let call = 0;

    const onStart = vi.fn();
    const onResult = vi.fn();
    const loader = createProfileLoader({
      fetch: () => fetches[call++],
      onStart,
      onResult,
    });

    const firstLoad = loader.load();
    const secondLoad = loader.load();

    // The newest request completes first…
    second.resolve("success");
    await secondLoad;

    // …and the older one lands afterwards, as a retried request can.
    first.resolve("stale error");
    await firstLoad;

    expect(onStart).toHaveBeenCalledTimes(2);
    expect(onResult).toHaveBeenCalledExactlyOnceWith("success");
  });

  it("forwards a later load started after both settled", async () => {
    const onStart = vi.fn();
    const onResult = vi.fn();
    const results = ["first", "second", "third"];
    let call = 0;
    const loader = createProfileLoader({
      fetch: () => Promise.resolve(results[call++]),
      onStart,
      onResult,
    });

    await loader.load();
    await loader.load();
    await loader.load();

    expect(onStart).toHaveBeenCalledTimes(3);
    expect(onResult).toHaveBeenNthCalledWith(1, "first");
    expect(onResult).toHaveBeenNthCalledWith(2, "second");
    expect(onResult).toHaveBeenNthCalledWith(3, "third");
  });

  it("calls onStart before awaiting the fetch, so the UI can show loading at once", () => {
    const onStart = vi.fn();
    const pending = deferred<string>();
    const loader = createProfileLoader({
      fetch: () => pending.promise,
      onStart,
      onResult: vi.fn(),
    });

    void loader.load();

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  /* `fetch` here is getInstitutionBySource, which encodes failure in its
     ApiResult and never rejects. If it ever does, the rejection propagates
     rather than being swallowed: a silently dropped rejection would pin the
     island in its loading state with nothing to retry. */
  it("propagates a rejected fetch instead of hanging on loading", async () => {
    const onResult = vi.fn();
    const loader = createProfileLoader({
      fetch: () => Promise.reject(new Error("boom")),
      onStart: vi.fn(),
      onResult,
    });

    await expect(loader.load()).rejects.toThrow("boom");
    expect(onResult).not.toHaveBeenCalled();
  });
});
