Read the 'AGENTS.md' before starting

# Unit 10: Buyer Demand Heatmap (Phase 2)

## Goal

Buyers see posted demand against forecast supply and unfilled demand zones.

## Depends On

Phase 1 complete. Unit 09 is not required.

## Build

- Map view for buyers per `design.md` Map section, with a floating overlay panel.
- Layers: posted demand, supply from open listings and pools (and forecast supply when Phase 3 exists), unfilled demand zones.
- Seeded demand data for the demo district.
- Village-level aggregation only.

## Not In This Unit

Risk forecast model, officer views, individual plot display.

## Acceptance Criteria

- [ ] Demand and supply layers render for the demo district.
- [ ] Unfilled demand zones are outlined and labelled, not shown by color alone.
- [ ] No individual plot or farmer appears on the map.
- [ ] Only buyers can open the view.

## Verify

Open the view as a buyer, then try as a farmer and a donor.
