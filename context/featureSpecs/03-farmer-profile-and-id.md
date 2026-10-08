Read the 'AGENTS.md' before starting

# Unit 03: Farmer Profile, Plots, And ID Verification

## Goal

A farmer completes a profile, adds plots, and reaches Verified ID status.

## Depends On

Unit 02.

## Build

- Migrations: `villages` (seeded for the chosen district), `farmers`, `plots`, `id_verifications`, plus RLS. Private storage bucket `id-documents`.
- Farmer profile form: name, village, district, language.
- Plot form: acres and a map pin (village centre default).
- ID verification form: ID type, last four digits, document image upload, consent text.
- Upload goes through the API: signature check (JPEG, PNG, PDF), 5 MB limit, random filename, metadata stripped, encrypted before storage, per `security-context.md`.
- Mocked review behind a config flag: auto-approve after upload, with one seeded rejection case. Mark with `MOCK:`.
- Status banner on the farmer dashboard: Not submitted, Pending, Verified, Rejected (with reason and resubmit).

## Not In This Unit

Listings, buyers, matching, real ID provider, storing any full ID number.

## Acceptance Criteria

- [ ] A farmer can add and see multiple plots.
- [ ] An upload lands in the private bucket and only the path is stored.
- [ ] A text file renamed to `.jpg` and a file over 5 MB are both rejected.
- [ ] Only the ID type, last four digits, and status are saved. No full number anywhere.
- [ ] Status moves Pending then Verified. The seeded rejection shows a reason and allows resubmission.
- [ ] A farmer cannot read another farmer's plots or documents (check RLS directly).
- [ ] All strings exist in English and Punjabi.

## Verify

Walk Farmer Flow steps 1 to 4. Query as a second farmer to confirm isolation.
