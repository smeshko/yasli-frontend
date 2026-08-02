#!/usr/bin/env node
/**
 * WCAG contrast gate for the shipped palette.
 *
 * Enumerates every text/background pair the design actually renders — not just
 * the headline hues — and exits non-zero if any falls below its floor.
 *
 *   node scripts/check-contrast.mjs
 */

const TOKENS = {
  bgPage: "#f4ecdf",
  bgSurface: "#fbf6ee",
  ink: "#201c17",
  inkMuted: "#5d554a",
  textSubtle: "#6b6255",
  textFaint: "#7a7061",
  nursery: "#c7361f",
  kindergarten: "#2b52c9",
  preschool: "#4a7550",
  white: "#ffffff",
  textError: "#9c2a17",
  textWarn: "#7a5514",
  bgErrorSoft: "#f8e3dc",
  bgWarnSoft: "#f6ead0",
  bgAccentSoft: "#f6e2d8",
};

// Tint circles are composited over the page ground with multiply at these
// alphas, so body copy laid over one must still pass.
const TINTS = [
  ["nursery tint", TOKENS.nursery, 0.22],
  ["kindergarten tint", TOKENS.kindergarten, 0.21],
  ["preschool tint", TOKENS.preschool, 0.24],
];

const AA_BODY = 4.5;
const AA_LARGE = 3.0;

function rgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance([r, g, b]) {
  const f = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a, b) {
  const [la, lb] = [luminance(rgb(a)), luminance(rgb(b))];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function multiplyOver(base, blend, alpha) {
  const [br, bg, bb] = rgb(base);
  const [xr, xg, xb] = rgb(blend);
  const mix = (b, x) => {
    const m = (b * x) / 255;
    return Math.round(b * (1 - alpha) + m * alpha);
  };
  const out = [mix(br, xr), mix(bg, xg), mix(bb, xb)];
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

const pairs = [
  ["ink on page", TOKENS.ink, TOKENS.bgPage, AA_BODY],
  ["ink on surface", TOKENS.ink, TOKENS.bgSurface, AA_BODY],
  ["muted on page", TOKENS.inkMuted, TOKENS.bgPage, AA_BODY],
  ["muted on surface", TOKENS.inkMuted, TOKENS.bgSurface, AA_BODY],
  ["subtle on page", TOKENS.textSubtle, TOKENS.bgPage, AA_BODY],
  ["faint (placeholder) on surface", TOKENS.textFaint, TOKENS.bgSurface, AA_BODY],
  ["nursery on page", TOKENS.nursery, TOKENS.bgPage, AA_BODY],
  ["nursery on surface", TOKENS.nursery, TOKENS.bgSurface, AA_BODY],
  ["kindergarten on page", TOKENS.kindergarten, TOKENS.bgPage, AA_BODY],
  ["kindergarten on surface", TOKENS.kindergarten, TOKENS.bgSurface, AA_BODY],
  ["preschool on page", TOKENS.preschool, TOKENS.bgPage, AA_BODY],
  ["preschool on surface", TOKENS.preschool, TOKENS.bgSurface, AA_BODY],
  ["white on nursery chip", TOKENS.white, TOKENS.nursery, AA_BODY],
  ["white on kindergarten chip", TOKENS.white, TOKENS.kindergarten, AA_BODY],
  ["white on preschool chip", TOKENS.white, TOKENS.preschool, AA_BODY],
  ["page on ink (active filter)", TOKENS.bgPage, TOKENS.ink, AA_BODY],
  ["error text on error bg", TOKENS.textError, TOKENS.bgErrorSoft, AA_BODY],
  ["warn text on warn bg", TOKENS.textWarn, TOKENS.bgWarnSoft, AA_BODY],
  ["muted on accent-soft note", TOKENS.inkMuted, TOKENS.bgAccentSoft, AA_BODY],
  ["footer link on page", TOKENS.nursery, TOKENS.bgPage, AA_BODY],
  ["ink border on page", TOKENS.ink, TOKENS.bgPage, AA_LARGE],
];

for (const [name, hue, alpha] of TINTS) {
  const tinted = multiplyOver(TOKENS.bgPage, hue, alpha);
  pairs.push([`ink over ${name}`, TOKENS.ink, tinted, AA_BODY]);
  pairs.push([`muted over ${name}`, TOKENS.inkMuted, tinted, AA_BODY]);
}

let failed = 0;
const width = Math.max(...pairs.map(([n]) => n.length));

console.log("WCAG contrast — shipped palette\n");
for (const [name, fg, bg, floor] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= floor;
  if (!ok) failed += 1;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name.padEnd(width)}  ${r.toFixed(2)}:1  (needs ${floor.toFixed(1)})`
  );
}

console.log(`\n${pairs.length - failed}/${pairs.length} pairs pass.`);
if (failed > 0) {
  console.error(`\n${failed} pair(s) below the floor.`);
  process.exit(1);
}
