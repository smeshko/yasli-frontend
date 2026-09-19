/* The scraper keeps every separator the source packs into `TEL` — slashes
   included — so multiple numbers survive as the portal gives them
   (`scraper/src/yasli_scraper/source.py`, five real shapes pinned in
   `scraper/tests/test_source.py`). ДЯ № 4's live value is
   "052 820758 0885665404": two numbers, space-separated, with no marker
   saying so. Stripping whitespace made that a single 19-digit `tel:` href
   that dials nothing, while the link text still read as two valid numbers.

   Nothing in the string says where one number ends. The separators inside a
   Bulgarian number — space, slash, dash — are the same ones used between
   numbers, so the only signal is length: a national number is 9 digits
   (052 613039) or 10 (0885 665 404). So take digit groups left to right and
   stop before the group that would overflow a valid number. The full
   published value always stays as the visible text, so a second number is
   never hidden — only never guessed at in an href. */

const NATIONAL = { min: 9, max: 10 };
/* +359 plus an 8- or 9-digit national number, country code included. */
const INTERNATIONAL = { min: 11, max: 12 };

export interface SplitPhone {
  /* The `tel:` value — digits, `+`-prefixed when the source gave a country
     code. Null when nothing in the string is a whole number. */
  dial: string | null;
  /* Always the full published value: the parent reads every number the
     source has, whether or not one of them could be linked. */
  display: string;
}

export function splitPhone(value: string): SplitPhone {
  const display = value.trim();

  return { dial: firstWholeNumber(display), display };
}

/* Written after +359, this is the national trunk prefix, which an
   international number must not carry: +359 (0)52 613039 dials as
   +35952613039. Dropping it is the only reading that is ever right. */
const TRUNK_PREFIX_AFTER_COUNTRY_CODE = /^\s*\(0\)?\s*|^\s*\(\s*0\s*\)\s*/;

function firstWholeNumber(text: string): string | null {
  const start = text.search(/\+359|0\d/);

  if (start === -1) {
    return null;
  }

  const international = text.startsWith("+359", start);
  const { min, max } = international ? INTERNATIONAL : NATIONAL;
  const rest = international
    ? text.slice(start + 4).replace(TRUNK_PREFIX_AFTER_COUNTRY_CODE, "")
    : text.slice(start);
  const groups = rest.match(/\d+/g) ?? [];

  let digits = international ? "359" : "";

  for (const group of groups) {
    if (digits.length + group.length > max) {
      break;
    }

    /* A lone digit after a number we already have is not part of it — it is
       an extension ("052 613039 вътр. 1") or an ordinal. Appending it fits
       inside max and produces a valid-looking href for a different
       subscriber, which is worse than linking nothing extra. Real groups
       inside a Bulgarian number are never one digit. */
    if (group.length === 1 && digits.length >= min) {
      break;
    }

    digits += group;
  }

  if (digits.length < min) {
    return null;
  }

  return international ? `+${digits}` : digits;
}

/* `mailto:` takes one address. A field holding two would otherwise become a
   single comma-joined recipient no client can deliver to. */
/* Bounded on both sides rather than "anything but a separator": a leading
   label with no space ("имейл:dg@example.bg") and a trailing sentence dot
   ("dg@example.bg.") both used to end up inside the mailto:. */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

export interface SplitEmail {
  address: string | null;
  display: string;
}

export function splitEmail(value: string): SplitEmail {
  const display = value.trim();
  const match = EMAIL.exec(display);

  return { address: match ? match[0] : null, display };
}
