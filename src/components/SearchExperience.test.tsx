import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SearchExperience } from "./SearchExperience";

describe("SearchExperience", () => {
  it("renders the final initial search surface", () => {
    const html = renderToStaticMarkup(<SearchExperience />);

    expect(html).toContain("Коя е моята градина?");
    expect(html).toContain("ул. Преслав 12");
  });
});
