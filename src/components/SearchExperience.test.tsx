import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SearchExperience } from "./SearchExperience";

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

describe("SearchExperience", () => {
  it("renders the final initial search surface", () => {
    const html = renderToStaticMarkup(<SearchExperience />);

    // The headline is split into spans so `моята` can be italic, so assert on
    // its text content rather than on a contiguous string in the markup.
    expect(stripTags(html)).toContain("Коя е моята градина?");
    expect(html).toContain("ул. Преслав 12");
  });
});
