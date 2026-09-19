import { useEffect, useMemo, useState } from "react";

import {
  getInstitutionBySource,
  type CoverageGroup,
  type InstitutionProfile as InstitutionProfileData,
} from "@/lib/api/client";
import { labelForDistrict } from "@/lib/domain/districts";
import { formatAddressNumber } from "@/lib/domain/address";
import { STALE_BANNER_TEXT, formatFreshnessDate, isSnapshotStale } from "@/lib/domain/freshness";
import { type ReceptionKind } from "@/lib/domain/kinds";
import { normalizeWebsiteUrl } from "@/lib/domain/website";
import { formatStreetLabel } from "@/lib/search/addressSuggestions";
import {
  findStoredMatchContext,
  loadStoredSearchState,
  type StoredMatchContext,
} from "@/lib/search/storedSearch";
import { createProfileLoader } from "@/lib/institutions/profileLoader";

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
  return code ? `Яслата обслужва район ${labelForDistrict(code)}.` : COPY.nurseryDistrictUnknown;
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
  now?: Date;
  onRetry: () => void;
}

export function InstitutionProfileView({
  status,
  profile,
  context,
  kind,
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
  const isStale = isSnapshotStale(profile.last_seen_at, comparisonDate);

  return (
    <>
      {context ? (
        <p className="profile-context" role="note">
          {contextText(context)}
        </p>
      ) : null}

      {isStale ? <div className="stale-banner">{STALE_BANNER_TEXT}</div> : null}

      <AddressSection address={profile.address} />
      <ContactsSection profile={profile} />
      <CoverageSection kind={kind} profile={profile} />
      <BranchesSection branches={profile.branches} />

      <p className="profile-meta">
        {COPY.freshnessPrefix} {formatFreshnessDate(new Date(profile.last_seen_at))}
      </p>
      <p className="profile-source">
        <a href={profile.source_url} target="_blank" rel="noreferrer">
          {COPY.sourceLink} <span aria-hidden="true">↗</span>
        </a>
      </p>
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
  const phone = present(profile.phone);
  const email = present(profile.email);
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
                <a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a>
              </dd>
            </>
          ) : null}
          {email ? (
            <>
              <dt>{COPY.emailLabel}</dt>
              <dd>
                <a href={`mailto:${email}`}>{email}</a>
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

function CoverageSection({
  kind,
  profile,
}: {
  kind: ReceptionKind;
  profile: InstitutionProfileData;
}) {
  /* Nurseries are routed by район, never by address — so the page shows the
     район and never a catchment list, even when the API returns rows.
     Kindergartens are the mirror image: their district_code is derived by
     catchment majority and is not an official fact, so it is never printed. */
  if (kind === "nursery") {
    return (
      <section aria-labelledby="profile-coverage">
        <h2 id="profile-coverage">{COPY.districtHeading}</h2>
        <p>{nurseryDistrictText(profile.district_code)}</p>
        <p className="profile-note">{COPY.nurseryNote}</p>
      </section>
    );
  }

  const hasCoverage = profile.coverage.length > 0;

  return (
    <section aria-labelledby="profile-coverage">
      <h2 id="profile-coverage">{COPY.coverageHeading}</h2>
      {hasCoverage ? (
        <CoverageList groups={profile.coverage} />
      ) : (
        <p className="profile-empty">
          {kind === "preschool" ? COPY.preschoolNoCoverage : COPY.kindergartenNoCoverage}
        </p>
      )}
    </section>
  );
}

/* API order is preserved: the backend already groups by street and sorts
   numbers naturally, and that ordering is contractual and tested there.
   Re-sorting here would duplicate the rule and drift from it. */
function CoverageList({ groups }: { groups: CoverageGroup[] }) {
  return (
    <ul className="profile-coverage">
      {groups.map((group) => (
        <li key={group.street.id}>
          <strong>{formatStreetLabel(group.street)}</strong>{" "}
          <span>{group.addresses.map((address) => formatAddressNumber(address)).join(", ")}</span>
        </li>
      ))}
    </ul>
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
}

export function InstitutionProfile({ kind, externalId }: InstitutionProfileProps) {
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
      onRetry={() => void loader.load()}
    />
  );
}
