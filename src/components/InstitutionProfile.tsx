import { useEffect, useMemo, useState } from "react";

import {
  getInstitutionBySource,
  type InstitutionLocation,
  type InstitutionProfile as InstitutionProfileData,
} from "@/lib/api/client";
import { splitEmail, splitPhone } from "@/lib/domain/contacts";
import { labelForDistrict } from "@/lib/domain/districts";
import {
  STALE_BANNER_TEXT,
  formatFreshnessDate,
  isSnapshotStale,
  parseFreshnessDate,
} from "@/lib/domain/freshness";
import { type ReceptionKind } from "@/lib/domain/kinds";
import { normalizeExternalUrl, normalizeWebsiteUrl } from "@/lib/domain/website";
import {
  findStoredMatchContext,
  loadStoredSearchState,
  type StoredMatchContext,
} from "@/lib/search/storedSearch";
import { createProfileLoader } from "@/lib/institutions/profileLoader";

import { InstitutionMap } from "./InstitutionMap";

export type ProfileStatus = "loading" | "success" | "error" | "not_found";

const COPY = {
  loading: "Зареждаме данните за институцията…",
  error: "Не успяхме да заредим данните за институцията.",
  retry: "Опитайте отново",
  notFound: "Институцията вече не е в източника. Възможно е да е премахната или преименувана.",
  backToSearch: "Към търсенето",
  addressHeading: "Адрес",
  addressMissing: "Адресът не е публикуван в източника.",
  contactsHeading: "Контакти",
  contactsMissing: "Няма публикувани контакти.",
  phoneLabel: "Телефон",
  emailLabel: "Имейл",
  directorLabel: "Директор",
  websiteLabel: "Уебсайт",
  districtHeading: "Район",
  coverageHeading: "Район на прием",
  /* Standing rule, not a fact about this nursery: admission is never by
     address, so an empty catchment is not missing data. */
  nurseryNote:
    "Яслите не са по адрес, имате право да кандидатствате във всяка, но получавате предимство в тези, които са във вашия район.",
  nurseryDistrictUnknown: "Районът на яслата не е потвърден в източника.",
  /* PRESCHOOL_COVERAGE_RESEARCH.md §5, verbatim: the municipality genuinely
     does not district preschools, so this is an answer, not a blank. */
  preschoolNoCoverage:
    "Няма публикувано райониране за това адресно местоположение. Подайте заявление в избрано от вас училище — Община Варна не задължава да се запишете в конкретно.",
  kindergartenNoCoverage: "Няма публикуван район на прием за тази градина в източника.",
  branchesHeading: "Филиали",
  freshnessPrefix: "Последна актуализация:",
  sourceLink: "Официален източник",
} as const;

function nurseryDistrictText(code: InstitutionProfileData["district_code"]): string {
  const label = labelForDistrict(code);

  return label ? `Яслата обслужва район ${label}.` : COPY.nurseryDistrictUnknown;
}

function contextText(context: StoredMatchContext): string {
  return context.matchBasis === "address"
    ? `Обслужва вашия адрес: ${context.addressLabel}.`
    : `Във вашия район — търсихте ${context.addressLabel}. Съвпадението е по район, не по точен адрес.`;
}

/* Absent is absent whether the backend sends null or "": phase 1.3 promises
   null, the CSV rows behind the data carry "". */
function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export interface InstitutionProfileViewProps {
  status: ProfileStatus;
  profile: InstitutionProfileData | null;
  context: StoredMatchContext | null;
  kind: ReceptionKind;
  location: InstitutionLocation | null;
  now?: Date;
  onRetry: () => void;
}

export function InstitutionProfileView({
  status,
  profile,
  context,
  kind,
  location,
  now,
  onRetry,
}: InstitutionProfileViewProps) {
  if (status === "loading") {
    return (
      <p className="profile-status" role="status">
        {COPY.loading}
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="profile-status profile-status--error" role="alert">
        <span>{COPY.error}</span>
        <button type="button" onClick={onRetry}>
          {COPY.retry}
        </button>
      </div>
    );
  }

  if (status === "not_found" || !profile) {
    return (
      <div className="profile-status profile-status--error" role="alert">
        <span>{COPY.notFound}</span>
        <a className="button" href="/">
          {COPY.backToSearch}
        </a>
      </div>
    );
  }

  const comparisonDate = now ?? new Date();
  /* Unparsable is not an error state: the rest of the profile is still worth
     showing. The banner and the line are simply the parts we cannot claim. */
  const freshnessDate = parseFreshnessDate(profile.last_seen_at);
  /* Same scraped pipeline as `website`, so the same rule: no value reaches an
     href without an explicit http(s) scheme. A relative `source_url` would
     otherwise become a same-origin link back into the site. */
  const sourceUrl = normalizeExternalUrl(profile.source_url);
  const isStale = freshnessDate ? isSnapshotStale(freshnessDate, comparisonDate) : false;

  return (
    <>
      {context ? (
        <p className="profile-context" role="note">
          {contextText(context)}
        </p>
      ) : null}

      {isStale ? <div className="stale-banner">{STALE_BANNER_TEXT}</div> : null}

      <AddressSection address={profile.address} />
      {/* The address names the place, the map shows it, then the page moves on
          to how to reach the people. Only in the success state: a container
          that appears, draws one pin and re-fits when branches arrive is two
          layout shifts for no information. */}
      <InstitutionMap location={location} branches={profile.branches} name={profile.name} />
      <ContactsSection profile={profile} />
      <CoverageSection kind={kind} profile={profile} />
      <BranchesSection branches={profile.branches} />

      {freshnessDate ? (
        <p className="profile-meta">
          {COPY.freshnessPrefix} {formatFreshnessDate(freshnessDate)}
        </p>
      ) : null}
      {sourceUrl ? (
        <p className="profile-source">
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            {COPY.sourceLink} <span aria-hidden="true">↗</span>
          </a>
        </p>
      ) : null}
    </>
  );
}

function AddressSection({ address }: { address: string | null }) {
  const value = present(address);

  return (
    <section aria-labelledby="profile-address">
      <h2 id="profile-address">{COPY.addressHeading}</h2>
      {value ? <p>{value}</p> : <p className="profile-empty">{COPY.addressMissing}</p>}
    </section>
  );
}

function ContactsSection({ profile }: { profile: InstitutionProfileData }) {
  /* The raw field can hold more than one number or address; only the first
     parsed one becomes an href, and the full published value stays as the
     link text so nothing the source gave is hidden. */
  const rawPhone = present(profile.phone);
  const rawEmail = present(profile.email);
  const phone = rawPhone ? splitPhone(rawPhone) : null;
  const email = rawEmail ? splitEmail(rawEmail) : null;
  const director = present(profile.director);
  /* Never the raw value: `website` is a scraped string, so only an http(s)
     URL may reach an href. Anything else is treated as absent. */
  const website = normalizeWebsiteUrl(profile.website);
  const hasAny = phone || email || director || website;

  return (
    <section aria-labelledby="profile-contacts">
      <h2 id="profile-contacts">{COPY.contactsHeading}</h2>
      {hasAny ? (
        <dl>
          {phone ? (
            <>
              <dt>{COPY.phoneLabel}</dt>
              <dd>
                {phone.dial ? <a href={`tel:${phone.dial}`}>{phone.display}</a> : phone.display}
              </dd>
            </>
          ) : null}
          {email ? (
            <>
              <dt>{COPY.emailLabel}</dt>
              <dd>
                {email.address ? (
                  <a href={`mailto:${email.address}`}>{email.display}</a>
                ) : (
                  email.display
                )}
              </dd>
            </>
          ) : null}
          {director ? (
            <>
              <dt>{COPY.directorLabel}</dt>
              <dd>{director}</dd>
            </>
          ) : null}
          {website ? (
            <>
              <dt>{COPY.websiteLabel}</dt>
              <dd>
                <a href={website} target="_blank" rel="noreferrer">
                  {website} <span aria-hidden="true">↗</span>
                </a>
              </dd>
            </>
          ) : null}
        </dl>
      ) : (
        <p className="profile-empty">{COPY.contactsMissing}</p>
      )}
    </section>
  );
}

/* The street-by-street address list is deliberately not rendered. A real
   catchment runs to ~1900 addresses across ~93 streets (ДГ№13 „Мир“), which
   on the page is a wall of numbers nobody reads and which buries everything
   below it. The search screen already answers "does this institution serve
   my address" precisely, so the list added length without adding an answer.
   This diverges from PRD FR-12; recorded in the plan's VALIDATION.md.

   What is left is the part that says something: nurseries are routed by
   район, never by address, so they name the район they serve; and where a
   kindergarten or preschool has no published catchment at all, that absence
   is itself the answer and keeps its researched copy. Kindergartens never
   print a district — theirs is derived by catchment majority and is not an
   official fact. */
function CoverageSection({
  kind,
  profile,
}: {
  kind: ReceptionKind;
  profile: InstitutionProfileData;
}) {
  if (kind === "nursery") {
    return (
      <section aria-labelledby="profile-coverage">
        <h2 id="profile-coverage">{COPY.districtHeading}</h2>
        <p>{nurseryDistrictText(profile.district_code)}</p>
        <p className="profile-note">{COPY.nurseryNote}</p>
      </section>
    );
  }

  if (profile.coverage.length > 0) {
    return null;
  }

  return (
    <section aria-labelledby="profile-coverage">
      <h2 id="profile-coverage">{COPY.coverageHeading}</h2>
      <p className="profile-empty">
        {kind === "preschool" ? COPY.preschoolNoCoverage : COPY.kindergartenNoCoverage}
      </p>
    </section>
  );
}

function BranchesSection({ branches }: { branches: InstitutionProfileData["branches"] }) {
  const lines = branches
    .map((branch) => {
      const label = present(branch.label);
      const address = present(branch.address);

      if (label && address) {
        return `${label} — ${address}`;
      }

      return label ?? address;
    })
    .filter((line): line is string => line !== null);

  if (lines.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="profile-branches">
      <h2 id="profile-branches">{COPY.branchesHeading}</h2>
      <ul className="profile-branches">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

export interface InstitutionProfileProps {
  kind: ReceptionKind;
  externalId: string;
  /* From the committed manifest, not from the fetched profile. They are the
     same value from the same table, and taking it from the manifest makes the
     main pin and the static link-outs above agree by construction rather than
     by coincidence. */
  location: InstitutionLocation | null;
}

export function InstitutionProfile({ kind, externalId, location }: InstitutionProfileProps) {
  const [status, setStatus] = useState<ProfileStatus>("loading");
  const [profile, setProfile] = useState<InstitutionProfileData | null>(null);
  const [context, setContext] = useState<StoredMatchContext | null>(null);

  /* Every state is decided in an effect, never during render: the server and
     the first client render both produce the loading state, so SSR markup and
     hydration always agree. Nothing here touches window or Date while
     rendering. */
  const loader = useMemo(
    () =>
      createProfileLoader({
        fetch: () => getInstitutionBySource(kind, externalId),
        onStart: () => setStatus("loading"),
        onResult: (result) => {
          if (result.ok) {
            setProfile(result.data);
            setStatus("success");
            return;
          }

          setProfile(null);
          setStatus(result.error.code === "institution_not_found" ? "not_found" : "error");
        },
      }),
    [kind, externalId],
  );

  useEffect(() => {
    void loader.load();
  }, [loader]);

  useEffect(() => {
    setContext(findStoredMatchContext(loadStoredSearchState(), kind, externalId));
  }, [kind, externalId]);

  return (
    <InstitutionProfileView
      status={status}
      profile={profile}
      context={context}
      kind={kind}
      location={location}
      onRetry={() => void loader.load()}
    />
  );
}
