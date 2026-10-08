Read the 'AGENTS.md' before starting

# Unit 05: Matching, Offers, And Pooling

## Goal

A confirmed listing receives an offer. Accepting it joins a village pool that fixes a pickup date at the minimum load.

## Depends On

Unit 04.

## Build

- Migrations: `offers`, `pools`, plus RLS. `listings.pool_id` set on acceptance.
- Matching service: weighted score of distance, price, capacity fit, availability overlap. Weights are config values.
- Offer shown to the farmer: price per tonne, pickup window, baler name, buyer. Accept and decline.
- Pooling service: group by village and nearby villages within a configured radius. Pool ready at the buyer's minimum load. Fix the pickup date and notify members.
- Pool progress component ("6.5 of 8 tonnes, 3 more farmers needed") with live updates.
- Buyer sees their pools with village, pooled tonnes, pickup date, and baler.

## Not In This Unit

Weighing, payment status, route optimisation, WhatsApp.

## Acceptance Criteria

- [ ] Confirming a listing creates an offer from the best-scoring buyer and baler.
- [ ] Accept adds the listing to an open pool or creates one. Decline keeps the listing open for a new match.
- [ ] Pool progress updates for all members when another farmer joins.
- [ ] At the minimum load the pool gets a pickup date and every member and the buyer get a notification.
- [ ] Matching and pooling have unit tests with fixed fixtures.
- [ ] Matching runs without any external network call.

## Verify

Walk Farmer Flow steps 6 to 8 and Buyer Flow step 3 with three seeded farmers in one village.
