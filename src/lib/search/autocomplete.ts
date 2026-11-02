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

// Focus moving to null or outside the container leaves; within it (e.g. into the listbox) stays.
export function isFocusLeaving(container: { contains(other: Node | null): boolean } | null, next: Node | null): boolean {
  return next === null || container === null || !container.contains(next);
}

// Only a still-stale match resets, and only once the reload worked; an edit or a failed reload leaves it be.
export function matchStateAfterStaleReload<T extends { status: string }>(current: T, reloaded: boolean, idle: T): T {
  return reloaded && current.status === "stale" ? idle : current;
}
