# ResidueLoop

> ResidueLoop is a working title. Rename it freely.

## Overview

ResidueLoop is a web platform that helps Punjab farmers sell paddy straw instead of burning it. Farmers sign in with a phone number and one-time password, verify an ID, list their residue, and get matched to a buyer and baler through village pooling. After pickup, satellite data checks the plot and the app shows it as Verified, Fire detected, or Inconclusive. Donors fund partner NGOs, and NGOs support farmers who cannot afford to stop burning. A WhatsApp channel (Phase 2) runs the same operations against the same database.

## Goals

1. Let users sign in with a phone number OTP and choose or be assigned one of four roles: farmer, buyer, donor, NGO.
2. Let farmers create a profile, add plots, and submit an ID proof for verification.
3. Let verified farmers list residue and receive a matched offer from a buyer and baler.
4. Pool farmers by village so buyers receive full truckloads on one pickup day.
5. Let buyers post demand, record weighed tonnes at pickup, and see payment status per pool.
6. Let farmers record their own payment status without any payment gateway.
7. Show a satellite-based status on each picked-up plot: Verified, Fire detected, or Inconclusive.
8. Let donors fund partner NGOs, and let NGOs support farmers who request help.
9. (Phase 2) Run the same operations over WhatsApp, with every message stored and shown in the app.
10. (Phase 2) Show buyers a demand heatmap against forecast supply.

## Phases

| Phase | Name                    | Contents                                                                                                                                                         |
| ----- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Web application         | Phone OTP login, four roles, farmer profile and ID verification, listings, matching, pooling, pickup and weighing, payment status, satellite verification, charity |
| 2     | WhatsApp and market view | WhatsApp two-way sync with the app, buyer demand heatmap                                                                                                         |
| 3     | Prediction and stretch  | Burn-risk and supply forecast, Punjabi voice notes, HYSPLIT trajectories, real payment integration, real ID verification partner                                 |

Work on Phase 1 only until the Phase 1 success criteria pass. Phase 2 and 3 items are not built early.

## Core User Flow

1. User opens the login page and signs in with a phone number and a one-time password.
2. A first-time user chooses a role (Farmer, Buyer, or Donor) and completes a short profile. NGO accounts are pre-seeded and recognised by phone number.
3. Farmer adds plots and submits an ID proof. The ID status becomes Verified (mocked review in the hackathon build).
4. Verified farmer lists residue from a plot and confirms the tonnage estimate.
5. The matching engine creates an offer: buyer, baler, price per tonne, and pickup window. Farmer accepts.
6. The listing joins a village pool. When the pool reaches the buyer's minimum load, a pickup date is fixed.
7. On pickup day the buyer enters the weighed tonnes per farmer and marks the pickup complete.
8. Farmer sees the amount due and updates the payment status: Pending, Received, or Not received.
9. A background job checks the plot with satellite data. The plot shows Verified, Fire detected, or Inconclusive.
10. A farmer who cannot afford to avoid burning requests support. The NGO reviews the request and records a disbursement.
11. Donor and NGO see the verified outcome for the funds used.

## Login Page And Role Flows

Every flow starts at the same login page. Expected results are written after each step so a unit can be checked against them.

### Login Page (all roles)

1. User opens the app. If not signed in, every protected route redirects to the login page.
2. User picks a display language (English or Punjabi) on the login page.
3. User enters a 10-digit Indian mobile number. The app adds +91 and sends an OTP. Result: OTP screen appears.
4. User enters the 6-digit OTP. Result: signed in and redirected by role.
5. Wrong OTP shows an inline error. Expired OTP shows a resend option. Resend is blocked during a cooldown.
6. First-time user (no profile) sees a role picker: Farmer, Buyer, Donor. Role is saved once and cannot be changed in the app.
7. A phone number matching a seeded NGO account skips the role picker and opens the NGO dashboard.
8. Sign out returns to the login page.

### Farmer Flow

1. After role selection, farmer enters name, village, district, and preferred language.
2. Farmer adds one or more plots: acres and a map pin (or village centre). Result: plots listed on the dashboard.
3. Farmer opens ID verification, chooses an ID type, enters the last four digits, uploads the document image, and accepts the consent text. Result: status Pending, then Verified or Rejected.
4. Rejected: farmer sees the reason and can resubmit. Not submitted or Pending: farmer can browse but cannot create a listing.
5. Verified farmer opens New listing, selects a plot, enters expected harvest date, and answers whether a combine with straw management was used. Result: estimated tonnes shown for confirmation.
6. Farmer confirms the listing. Result: matching runs and an offer appears (price per tonne, pickup window, baler name, buyer).
7. Farmer accepts or declines the offer. Accept joins a village pool. Decline closes the offer and keeps the listing open for a new match.
8. Farmer sees pool progress ("6.5 of 8 tonnes, 3 more farmers needed") and the pickup date once fixed.
9. After the buyer records the weight, farmer sees weighed tonnes and amount due.
10. Farmer sets payment status to Pending, Received, or Not received. Buyer sees the same value.
11. After the satellite check, the plot shows Verified, Fire detected, or Inconclusive with the date checked, fire hits, burn-scar change, and a confidence label.
12. Farmer short of funds taps Request support, selects a reason and amount, and submits to the NGO covering their district. Result: request status Submitted, then Approved, Disbursed, or Declined.
13. (Phase 2) Everything above can also be done or queried on WhatsApp, and every WhatsApp input appears in the farmer's activity timeline tagged "via WhatsApp".

### Buyer Flow

1. After role selection, buyer enters organisation name, type (biomass, CBG, kiln, mill), location pin, capacity, price per tonne, and minimum load in tonnes.
2. Buyer opens Demand and posts a demand: tonnes needed, price, location, date range. Result: post appears in the buyer's list.
3. Buyer sees pools assigned to them: village, pooled tonnes, pickup date, baler.
4. On pickup day, buyer opens the pool and enters weighed tonnes for each farmer, adds optional quality notes, and marks the pickup complete. Result: amount due is calculated per farmer.
5. Buyer sees payment status per farmer as updated by farmers. Not received is flagged.
6. Buyer sees the verification status for picked-up pools at village level.
7. (Phase 2) Listings that arrived through WhatsApp appear alongside web listings, tagged with their source.
8. (Phase 2) Buyer opens the demand heatmap: posted demand against forecast supply, with unfilled demand zones highlighted.

### Donor Flow

1. After role selection, donor chooses Individual or Company and enters a name.
2. Donor browses partner NGOs and the villages each NGO works in.
3. Optional: donor picks a city and sees villages ranked by "likely influence" on that city's air. The wording is never "cause".
4. Donor chooses an NGO (and optionally a village), enters an amount, and donates. Result: donation recorded in test mode, estimated tonnes shown and labelled as an estimate.
5. Donor sees donation history with status for each donation.
6. When a funded pool is picked up and verified, donor receives an in-app notification: "Your donation helped divert tonnes from Village X. No fire detected." Fire detected and Inconclusive have their own honest wording.

### NGO Flow

1. NGO signs in with a seeded phone number and lands on the funds dashboard: received, allocated, disbursed, and a ledger.
2. NGO opens the support request queue filtered to its region.
3. NGO reviews a request (reason, amount, linked listing and pool) and approves or declines it.
4. NGO records a disbursement against a donation: payee type (baler, transport provider, or farmer), amount, note. Recommended: pay the baler or transport provider directly.
5. After the satellite check, NGO sees the outcome next to the funds disbursed for that request.

## Features

### Authentication And Roles

- Phone number OTP sign-in and route protection by role.
- First-sign-in role selection for farmer, buyer, donor. NGO accounts are seeded.
- Language selection (English, Punjabi).

### Farmer Onboarding And ID Verification

- Profile, villages, and plots with map pin and acres.
- ID proof upload with status: Not submitted, Pending, Verified, Rejected.
- Only the ID type, last four digits, and status are stored. Document images are private.
- Review is mocked in the hackathon build.

### Listings, Matching, And Pooling

- Listing creation with an estimate of 2 to 3 tonnes of straw per acre (assumption to validate with a real farmer).
- Matching by weighted score of distance, price, capacity fit, and availability overlap. Weights are config values.
- Village pooling to the buyer's minimum load (assumption 8 to 10 tonnes, configurable), with one pickup date per pool.

### Pickup, Weighing, And Payment Status

- Buyer enters weighed tonnes per farmer at pickup.
- Amount due is weighed tonnes times the agreed price.
- Farmer records payment status. The platform records the value only. It does not move money.

### Satellite Verification

- NASA FIRMS fire detections inside the plot buffer between harvest and sowing.
- Sentinel-2 normalised burn ratio (NBR) before and after pickup.
- Verdict: Verified, Fire detected, or Inconclusive (cloud cover or missed overpass), with a confidence label.
- The result is shown as a status inside the app. There is no certificate.

### Charity

- Donor and NGO logins, donation recording in test mode, farmer support requests, NGO approval, and disbursement log.
- A ledger links each donation to disbursements, requests, pools, and the final verified outcome.

### WhatsApp Sync (Phase 2)

- Two-way WhatsApp channel on the same backend and database.
- Every inbound and outbound message stored and listed in the app.
- Farmers can create listings, accept offers, ask questions, update payment status, and request support.

### Buyer Demand Heatmap (Phase 2)

- Map of posted demand against forecast supply with unfilled demand zones highlighted.

## Scope

### In Scope

- Phone OTP authentication, role-based route protection, and role selection
- Farmer profile, plots, and ID proof upload with mocked review
- Buyer profile and demand posts
- Residue listings, matching, offers, and village pools
- Buyer-entered weights at pickup and farmer-updated payment status
- Satellite verification with a status shown in the app
- Donor and NGO logins, donations in test mode, farmer support requests, and a disbursement ledger
- Wind-link ranking of villages for a chosen city, labelled "likely influence"
- In-app notifications
- Security hardening: security headers, rate limits, OTP abuse protection, DNS and domain protections, upload validation, and access control tests
- (Phase 2) WhatsApp sync and the buyer demand heatmap

### Out Of Scope

- Digital certificates, certificate IDs, hashes, QR codes, and share links
- Payment gateways, real UPI payouts, escrow, and payment guarantees
- District officer, panchayat, or any government login or dashboard
- Baler operator login, day plans, and route optimisation
- Real ID verification provider (the review step is mocked)
- Enterprise permission tiers beyond the four roles
- Public display of individual plots (village-level only)
- Claims of exact cause for city air quality
- Billing and subscription systems
- Mobile-native applications

### Later Phases (not built in Phase 1)

- Phase 3: burn-risk and supply forecast, Punjabi voice notes, HYSPLIT trajectories, real payment integration, real ID verification partner

## Success Criteria

1. A user can sign in with a phone number OTP and land on the correct role dashboard.
2. A farmer can add a plot, submit an ID, and reach Verified status.
3. A verified farmer can list residue, receive an offer, and join a village pool.
4. A buyer can post demand, enter weights at pickup, and see payment status.
5. A farmer can update payment status and the buyer sees the change.
6. A picked-up plot shows a Verified, Fire detected, or Inconclusive status in the app.
7. A donor can donate to an NGO, a farmer can request support, and the NGO can approve and disburse.
8. A donor sees the verified outcome for funds that were disbursed.
9. Metadata and ID documents are stored in the correct layers, and no full ID number is stored anywhere.
10. The security checklist passes: unauthorised access is rejected for every role, OTP abuse protections are on, and security headers are present.
11. (Phase 2) A WhatsApp message creates the same record as the web form and appears in the app and the buyer's view.
