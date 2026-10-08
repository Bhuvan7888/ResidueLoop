Read the 'AGENTS.md' before starting

# Unit 06: Pickup, Weighing, And Payment Status

## Goal

The buyer records weighed tonnes at pickup. The farmer sees the amount due and records payment status.

## Depends On

Unit 05.

## Build

- Migration: `pickups` (one row per farmer listing in a pool), `notifications`, plus RLS.
- Buyer pickup screen: enter weighed tonnes per farmer, optional quality notes, mark the pickup complete.
- Amount due = weighed tonnes times the agreed price, calculated in the API.
- Farmer sees weighed tonnes and amount due, and sets payment status: Pending, Received, Not received.
- Buyer sees payment status per farmer. Not received is flagged.
- Marking a pickup complete queues a verification job (the job itself is built in Unit 07).

## Not In This Unit

Any payment processing or gateway, escrow, payment disputes workflow, satellite checks.

## Acceptance Criteria

- [ ] Only the pool's buyer can enter weights, and only for that pool.
- [ ] Amount due matches weighed tonnes times price, covered by a unit test.
- [ ] A farmer can set payment status only on their own pickup.
- [ ] The buyer sees a status change without a manual reload.
- [ ] No code path moves money or calls a payment provider.

## Verify

Walk Buyer Flow steps 4 to 5 and Farmer Flow steps 9 to 10 with two farmers in one pool.
