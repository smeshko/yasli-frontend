import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DirectoryGroup } from "@/lib/institutions/directory";

import { InstitutionDirectory, InstitutionDirectoryView } from "./InstitutionDirectory";

const groups: DirectoryGroup[] = [
  {
    kind: "nursery",
    label: "Ясла",
    rows: [{ key: "nursery-4", name: "ДЯ № 4", href: "/institution/nursery-4/", hasInfantGroup: false }],
  },
  {
    kind: "kindergarten",
    label: "Детска градина",
    rows: [
      { key: "kindergarten-38", name: "ДГ№5", href: "/institution/kindergarten-38/", hasInfantGroup: true },
      { key: "kindergarten-999999", name: "ДГ№60", href: null, hasInfantGroup: false },
    ],
  },
];

function render(status: "loading" | "success" | "error", list: DirectoryGroup[] = []) {
  return renderToStaticMarkup(
    <InstitutionDirectoryView status={status} groups={list} onRetry={() => undefined} />,
  );
}

describe("InstitutionDirectoryView", () => {
  it("shows a status line and no group while loading", () => {
    const html = render("loading", groups);
    expect(html).toContain('role="status"');
    expect(html).toContain("Зареждаме списъка с институции…");
    expect(html).not.toContain("<h2");
  });

  it("shows an alert with a retry button on error", () => {
    const html = render("error");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Не успяхме да заредим списъка с институции.");
    expect(html).toContain('<button type="button">Опитайте отново</button>');
  });

  it("renders headings in kind order with counts", () => {
    const html = render("success", groups);
    expect(html).toContain('<h2 id="directory-group-nursery">Ясла<span class="group-count">1</span></h2>');
    expect(html).toContain('<span class="group-count">2</span>');
    expect(html.indexOf("Ясла")).toBeLessThan(html.indexOf("Детска градина"));
  });

  it("links a row with a page and leaves a row without one as plain text", () => {
    const html = render("success", groups);
    expect(html).toContain('<a class="directory-link" href="/institution/kindergarten-38/">ДГ№5</a>');
    expect(html).toContain("<span>ДГ№60</span>");
    expect(html.match(/<a /g)).toHaveLength(2);
  });

  it("marks only the infant-group row", () => {
    const html = render("success", groups);
    expect(html.match(/яслена група/g)).toHaveLength(1);
    expect(html).toContain('ДГ№5</a><span class="directory-tag">яслена група</span>');
  });

  it("shows the empty copy for a successful empty list", () => {
    const html = render("success", []);
    expect(html).toContain("Няма публикувани институции.");
    expect(html).not.toContain("<h2");
  });
});

describe("InstitutionDirectory", () => {
  it("renders the loading state on first render", () => {
    const html = renderToStaticMarkup(<InstitutionDirectory />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Зареждаме списъка с институции…");
  });
});
