Read the 'AGENTS.md' before starting

# Unit 09: WhatsApp Sync (Phase 2)

## Goal

Farmers can run core operations and ask questions on WhatsApp. Every message is stored and shown in the app.

## Depends On

Units 01 to 08 complete. Phase 1 success criteria passing.

## Build

- Migration: `messages`, plus RLS.
- Webhook with Meta signature verification (Twilio sandbox accepted for the demo). Phone number matched to a profile. Unknown numbers get a registration message.
- LLM parser with a strict JSON schema for intents: create listing, accept offer, ask pickup date, ask pool progress, ask payment status, set payment status, request support.
- Operations run through the same service layer as the web app. Questions are answered from database queries filled into fixed Punjabi templates.
- Farmer activity timeline listing web and WhatsApp actions with the "via WhatsApp" tag. Buyer view shows the source on each listing.

## Not In This Unit

Voice notes, speech-to-text, any operation that exists only on WhatsApp, the heatmap.

## Acceptance Criteria

- [ ] A WhatsApp message creates the same listing record as the web form, with `source = whatsapp`.
- [ ] The raw message, parsed JSON, and intent are stored.
- [ ] Questions return values read from the database, never model-generated values.
- [ ] A forged webhook signature is rejected.
- [ ] The timeline and the buyer view show the WhatsApp-sourced records.
- [ ] If parsing fails, the farmer gets a short clarification and no record is created.

## Verify

Send a Punjabi message to the sandbox and follow the record through the farmer timeline and the buyer view.
