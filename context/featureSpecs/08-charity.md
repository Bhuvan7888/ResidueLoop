Read the 'AGENTS.md' before starting

# Unit 08: Charity (Donors And NGOs)

## Goal

Donors fund NGOs. Farmers request support. NGOs approve and disburse. Donors see the verified outcome.

## Depends On

Unit 07.

## Build

- Migrations: `ngos`, `donations`, `assistance_requests`, `disbursements`, plus RLS.
- Donor dashboard: partner NGOs and their villages, donate form (test mode, estimated tonnes labelled "Estimate"), history, notifications.
- Wind-link ranking: pick a city, call Open-Meteo, rank villages, show with "likely influence" wording on a village-level map.
- Farmer Request support form and status.
- NGO dashboard: funds received, allocated, disbursed, ledger, request queue, approve or decline, record a disbursement (payee: baler, transport provider, or farmer).
- Outcome notifications to donors and NGOs when a funded plot's verification completes, with honest wording for all three verdicts.

## Not In This Unit

Payment gateway, real money movement, tax receipts, platform fee, public plot display.

## Acceptance Criteria

- [ ] A donor can donate to a seeded NGO and see it in history.
- [ ] A farmer can submit a request linked to a listing. Only the addressed NGO can see it.
- [ ] An NGO can approve, decline, and record a disbursement. The ledger totals add up.
- [ ] A donor sees the outcome notification after the linked verification, including for Fire detected and Inconclusive.
- [ ] Donors and NGOs only see village-level locations, never individual plots.
- [ ] The wind-link list never uses the word "cause".
- [ ] No code path moves money.

## Verify

Walk Donor Flow and NGO Flow in `project-overview.md` end to end with one farmer request.
