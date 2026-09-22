import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  integrations: [react()],
  vite: {
    /* MapLibre starts its tile-parsing worker with `{ type: "module" }`, so the
       worker bundle has to be an ES module too — Vite's default is an IIFE,
       which that worker refuses to start. See the `?worker&url` import in
       src/components/InstitutionMap.tsx. */
    worker: { format: "es" },
  },
});
