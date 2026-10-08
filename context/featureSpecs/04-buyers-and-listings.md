Read the 'AGENTS.md' before starting

# Unit 04: Buyers And Listings

## Goal

Buyers have profiles and post demand. Verified farmers create listings with a tonnage estimate.

## Depends On

Unit 03.

## Build

- Migrations: `buyers`, `demand_posts`, `balers` (seeded, 5 to 10 balers), `listings`, plus RLS. Seed 5 to 10 buyers with locations and prices.
- Buyer profile form and demand post form and list.
- Farmer New listing form: plot, expected harvest date, combine with straw management yes or no.
- Tonnage estimate (2 to 3 tonnes per acre, config values) shown for confirmation and labelled "Estimate".
- Listing is blocked unless the farmer's ID status is Verified.

## Not In This Unit

Matching, offers, pools, WhatsApp, heatmap.

## Acceptance Criteria

- [ ] A buyer can create a profile and post, view, and edit a demand post.
- [ ] A Verified farmer can create a listing and see the estimate before confirming.
- [ ] An unverified farmer cannot create a listing, in the UI and in the API.
- [ ] Listings are only readable by the owning farmer at this stage.
- [ ] Estimate bounds are config values, not literals.

## Verify

Walk Buyer Flow steps 1 to 2 and Farmer Flow steps 5 to 6 (up to confirmation). Call the listing API as an unverified farmer.
