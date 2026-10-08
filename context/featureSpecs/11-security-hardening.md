Read the 'AGENTS.md' before starting

# Unit 11: Security Hardening

## Goal

Every Phase 1 route, table, and deployment setting passes the security checklist, and the domain and DNS protections are in place.

## Depends On

Unit 08.

## Build

- Audit every route against the role access table in `architecture-context.md`. Fix gaps in the API and in RLS.
- pgTAP tests for every table and every role. Negative cases: wrong role, another user's record, unauthenticated.
- API tests for IDOR, bad input, oversized bodies, and rate limits on OTP, upload, listing creation, and support requests.
- Per-user limits on queued verification jobs.
- Confirm the outbound host allowlist contains only the hosts listed in `security-context.md`.
- Deployment: security headers live on both web and API, API docs disabled in production, test OTP numbers removed from production config.
- DNS checklist executed and recorded in `README.md`: registrar lock and 2FA, DNSSEC where supported, CAA records, no dangling or wildcard records, HTTPS only with HSTS, API origin locked to the CDN or WAF.
- Dependency audit clean for high and critical findings. Secret scan clean across history.

## Not In This Unit

New product features, Phase 2 work.

## Acceptance Criteria

- [ ] For each role, every route and table access outside the access table is denied. Other users' records return `404`.
- [ ] Repeated OTP requests, uploads, and listing creations are rate limited.
- [ ] A forged `Host` header, a disallowed origin, and an oversized body are rejected.
- [ ] A server-side request to a host outside the allowlist is blocked by the shared HTTP client.
- [ ] Security headers match `security-context.md` on web and API responses.
- [ ] `dig` shows CAA records and no wildcard records. DNSSEC is enabled if the provider supports it. The registrar lock is on.
- [ ] The production web bundle contains no service role key or secret pattern.
- [ ] `npm audit` and `pip-audit` report no high or critical findings.
- [ ] The checklist at the end of `security-context.md` is ticked for Units 01 to 08.

## Verify

Run the full test suite, the secret scan, the audits, and a manual pass with a second account of each role against another account's record IDs.
