export type ReferenceStatus = "idle" | "loading" | "ready" | "error";

// The listbox and aria-expanded both read this, so they can't disagree.
export function isSuggestionListShown({ referenceStatus, isOpen, suggestionCount }: {
  referenceStatus: ReferenceStatus;
  isOpen: boolean;
  suggestionCount: number;
}): boolean {
  return referenceStatus === "ready" && isOpen && suggestionCount > 0;
}
