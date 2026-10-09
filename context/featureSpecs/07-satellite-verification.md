Read the 'AGENTS.md' before starting

# Unit 07: Satellite Verification

## Goal

A picked-up plot shows Verified, Fire detected, or Inconclusive with its evidence.

## Depends On

Unit 06.

## Build

- Migration: `verifications`, plus RLS.
- Background job in `api/app/jobs`: fetch FIRMS detections inside the plot buffer for the window, fetch before and after Sentinel-2 images, compute NBR change, apply the verdict rules in `architecture-context.md`.
- Config values: NBR drop threshold, window length, buffer radius.
- Inconclusive schedules a recheck job.
- Status shown on the plot and pool with date checked, fire hits, NBR change, and a confidence label. Limits text shown for Inconclusive.
- In-app notifications to linked donors and NGOs (wired fully in Unit 08).
- A way to run verification against last season's data for a seeded plot, for the demo.

## Not In This Unit

Certificates, hashes, QR codes, share links, forecast, performing satellite work inside a request handler.

## Acceptance Criteria

- [x] A fixture with a FIRMS hit returns Fire detected.
- [x] A fixture with no hit, no drop, and usable images on both sides returns Verified.
- [x] A fixture with cloud cover returns Inconclusive and schedules a recheck. It is never shown as Verified.
- [x] The result row stores only the small summary. No imagery is persisted.
- [x] Verdict rules are unit tested for all three outcomes.
- [x] The API handler only queues the job and returns.

## Verify

Run the three fixtures. Run the demo seed plot and view its status as the farmer and the buyer.
