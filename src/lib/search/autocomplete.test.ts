import { describe, expect, it } from "vitest";
import { isSuggestionListShown, preventsNativeKeyDefault, type ReferenceStatus } from "./autocomplete";

describe("isSuggestionListShown", () => {
  it("is true when reference data is ready, the list is open and there are suggestions", () => {
    expect(isSuggestionListShown({ referenceStatus: "ready", isOpen: true, suggestionCount: 3 })).toBe(true);
  });

  it("is false once the list is closed (Escape)", () => {
    expect(isSuggestionListShown({ referenceStatus: "ready", isOpen: false, suggestionCount: 3 })).toBe(false);
  });

  it("is false with no suggestions (empty field or no match)", () => {
    expect(isSuggestionListShown({ referenceStatus: "ready", isOpen: true, suggestionCount: 0 })).toBe(false);
  });

  it.each<ReferenceStatus>(["idle", "loading", "error"])("is false while reference status is %s", (referenceStatus) => {
    expect(isSuggestionListShown({ referenceStatus, isOpen: true, suggestionCount: 3 })).toBe(false);
  });
});

describe("preventsNativeKeyDefault", () => {
  it.each([true, false])("prevents Escape so type=search keeps the query (list open: %s)", (isOpen) => {
    expect(preventsNativeKeyDefault("Escape", isOpen)).toBe(true);
  });

  it.each([true, false])("prevents Enter (list open: %s)", (isOpen) => {
    expect(preventsNativeKeyDefault("Enter", isOpen)).toBe(true);
  });

  it.each(["ArrowUp", "ArrowDown"])("prevents %s only while the list is open", (key) => {
    expect(preventsNativeKeyDefault(key, true)).toBe(true);
    expect(preventsNativeKeyDefault(key, false)).toBe(false);
  });

  it("lets other keys through", () => {
    expect(preventsNativeKeyDefault("a", true)).toBe(false);
  });
});
