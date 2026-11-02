export function normalizePath(path: string): string {
  const normalizedPath = path.replace(/\/+$/, "");
  return normalizedPath === "" ? "/" : normalizedPath;
}

export const NAV_ITEMS = [
  { href: "/", label: "Търсене" },
  { href: "/institutions/", label: "Всички институции" },
] as const;

export function buildNavItems(pathname: string) {
  const current = normalizePath(pathname);
  return NAV_ITEMS.map((item) => ({ ...item, active: current === normalizePath(item.href) }));
}
