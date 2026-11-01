export type ReferenceStatus = "idle" | "loading" | "ready" | "error";

// The listbox and aria-expanded both read this, so they can't disagree.
export function isSuggestionListShown({ referenceStatus, isOpen, suggestionCount }: {
  referenceStatus: ReferenceStatus;
  isOpen: boolean;
  suggestionCount: number;
}): boolean {
  return referenceStatus === "ready" && isOpen && suggestionCount > 0;
}

// Escape is prevented even on a closed list: type="search" otherwise clears the field natively.
export function preventsNativeKeyDefault(key: string, isOpen: boolean): boolean {
  if (key === "Escape" || key === "Enter") {
    return true;
  }

  return isOpen && (key === "ArrowUp" || key === "ArrowDown");
}
