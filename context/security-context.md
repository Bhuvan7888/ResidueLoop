# Security Context

Security rules for every unit. They are requirements, not suggestions. Apply the checklist at the end to every unit before calling it done.

## Threats Covered

| Threat                                              | Where it is handled                          |
| --------------------------------------------------- | -------------------------------------------- |
| DNS hijacking, spoofing, subdomain takeover         | DNS And Network Layer                        |
| DDoS and request floods                             | DNS And Network Layer, API Hardening         |
| DNS rebinding, host header attacks, SSRF            | DNS And Network Layer                        |
| OTP abuse, SMS pumping, account takeover            | Authentication Hardening                     |
| Broken access control, IDOR                         | Authorization                                |
| Injection, XSS, CSRF                                | Web And API Hardening                        |
| Malicious file uploads                              | File Uploads                                 |
| Secret leakage, PII leakage                         | Data Protection                              |
| Vulnerable or malicious dependencies                | Supply Chain                                 |
| Forged webhooks, prompt injection (Phase 2)         | Integrations                                 |

## DNS And Network Layer

Domain and DNS (done at deployment, verified with `dig` and the registrar console):

- Registrar account uses a hardware key or app-based 2FA. Registrar transfer lock is on. WHOIS privacy is on.
- DNSSEC is enabled on the zone if the registrar and DNS provider support it.
- CAA records limit certificate issuance to the chosen certificate authority only.
- DNS is hosted with a provider that offers DDoS absorption and access control. Only that provider's account can change records.
- No dangling records. Remove any CNAME or A record for a service that is no longer deployed. This prevents subdomain takeover. Review all records on every infrastructure change.
- No wildcard DNS records.
- HTTPS only. HTTP redirects to HTTPS. TLS 1.2 or newer. HSTS with `max-age=31536000; includeSubDomains`. Add `preload` only after every subdomain serves HTTPS.
- The web app uses the host's built-in DDoS protection. The API sits behind a CDN and web application firewall, and the origin accepts traffic only from it (authenticated origin pulls or an IP allowlist). Confirm the exact setup in the hosting provider's current documentation.

Application-level protection against DNS-based attacks:

- Host header validation: the API accepts only its own hostnames (`TrustedHostMiddleware` with an allowlist). This blocks DNS rebinding and host header injection.
- CORS: an explicit allowlist of the web origin(s). No wildcard origin. No credentials with a wildcard.
- SSRF and DNS rebinding on outbound calls: the server never fetches a user-supplied URL. All outbound calls go through one HTTP client that allows only the configured hosts (NASA FIRMS, Copernicus or Sentinel Hub, Open-Meteo, the WhatsApp or Twilio API, the LLM provider, Supabase), enforces timeouts, and does not follow redirects to other hosts.
- If email is ever added, publish SPF, DKIM, and DMARC records first.

Flood and abuse protection:

- Rate limits at the edge and in the API, per IP and per user. Stricter limits on OTP requests, uploads, listing creation, and any route that queues a job.
- Request body size limits and request timeouts on every route. Pagination capped at 100 items.
- Background queue limits per user so one account cannot flood the verification queue.

## Authentication Hardening

- Supabase Auth: enable only the Phone provider. Disable email sign-ups and anonymous sign-ins. Set the allowed redirect URLs to the real web origin only.
- Allow only +91 numbers. Reject other country codes before an SMS is sent. This blocks SMS pumping to premium numbers.
- Turn on CAPTCHA protection for OTP requests (Supabase supports hCaptcha and Cloudflare Turnstile).
- Set Supabase auth rate limits for SMS and OTP verification attempts. Show a resend cooldown in the UI. Show the same message whether or not the number is registered.
- OTP test numbers exist only in the hackathon build and are removed before production.
- The API verifies the Supabase JWT on every request: signature, algorithm pinned to what the project uses, `aud`, and `exp`. It rejects anything else.
- Supabase JS keeps the session in browser storage by default, so a strict CSP and no raw HTML rendering are mandatory to prevent token theft through XSS.
- Because tokens travel in the `Authorization` header and not in cookies, CSRF does not apply. If cookies are ever introduced, use `SameSite=Lax` or stricter and CSRF tokens.
- Sign-out clears the session. Roles are read from the database, never from client-supplied claims.

## Authorization

- Deny by default. Row level security is enabled on every table and every policy has a pgTAP test per role.
- The API enforces role and ownership on every mutation and every read. Every query is scoped to the caller's own records or to a rule in the access table in `architecture-context.md`.
- Never trust an ID from the client to mean access. A valid UUID for someone else's record returns `404`, not `403`, to avoid confirming it exists.
- The service role key lives only in the API and worker environment and is used only for cross-user operations that the access table allows.
- NGO roles are created only by seed or admin migration, never by sign-up.
- Business writes are API-only. There is no browser insert or update policy on `listings`, `offers` or `pickups`, and the browser roles cannot insert or update `id_status` on `farmers` or any row of `id_verifications`. This keeps "only verified farmers can list" and "only the pool's buyer enters weights" from being bypassed with the anon key. See "Write Path" in `architecture-context.md`.
- The role check treats a missing profile as no role (`403`) and lets real database errors surface as `500`. It never turns an outage into a silent permission result.
- Every `.env` file is git-ignored by the root `.gitignore`. Only `.env.example` (names only) is committed.

## Web And API Hardening

Security headers (set in `web/vercel.json` for the web app and in API middleware):

| Header                      | Value                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | `default-src 'self'`; `script-src 'self'`; `connect-src` limited to self, Supabase, the API, and the map tile host; `img-src 'self' data:` plus the tile host; `worker-src blob:` for the map; `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`                                                   |
| `X-Content-Type-Options`    | `nosniff`                                                                               |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                       |
| `Permissions-Policy`        | Deny camera, microphone, and geolocation unless a feature needs it                      |
| `Cross-Origin-Opener-Policy`| `same-origin`                                                                           |

Rules:

- No `dangerouslySetInnerHTML`, no `eval`, no inline scripts. User text is always rendered as text.
- No third-party scripts. Fonts and assets are self-hosted.
- Only the Supabase anon key and public map key are in the web bundle. CI fails the build if the service role key or any secret pattern appears in it.
- All input is validated by Pydantic (extra fields forbidden) and zod. All SQL is parameterised. Output errors are generic.
- API docs routes (`/docs`, `/openapi.json`) are disabled in production. The health route returns status only.
- JSON only. Reject unexpected content types. Enforce maximum body sizes.
- Uploads and expensive routes require authentication and have their own rate limits.

## File Uploads

ID documents are the only uploads in Phase 1.

- Upload goes through the API, not directly from the browser to storage.
- Accept only JPEG, PNG, and PDF, checked by file signature (magic bytes), not by extension or declared type.
- Maximum size 5 MB. Reject anything larger before reading it fully.
- Generate a random server-side filename. Never use the client's filename in a path.
- Strip image metadata (it can contain location data).
- Store in the private bucket `id-documents` at `{farmerId}/{documentId}`. Encrypt the file with `ENCRYPTION_KEY` (AES-256-GCM) before storing.
- No endpoint returns document contents in Phase 1. If a download is ever needed, use a signed URL that expires in 60 seconds, issued only to an authorised reviewer.
- Retention of ID documents is an open question in `progress-tracker.md`. Default: delete the file after review and keep only the ID type, last four digits, and status.

## Data Protection

- Collect the minimum data. Phone numbers are stored in E.164 format in `profiles` only.
- Individual plots are never shown publicly. Donors and NGOs see village-level data.
- Never store full ID numbers, OTPs, or payment details.
- Logs are structured, carry a request ID, and never contain full phone numbers, OTPs, tokens, secrets, ID data, or document contents.
- Show a consent screen before ID upload that states what is stored and why. Confirm the obligations under India's Digital Personal Data Protection Act (consent, purpose limitation, deletion on request) before production.
- Secrets are environment variables, never in code, never in the repository, never in logs. Rotate any secret that is exposed.

## Integrations

- Third-party responses are validated against schemas before use. Timeouts and retries with backoff on every call.
- WhatsApp webhook (Phase 2): verify the signature on the raw request body with a constant-time comparison, reject missing or invalid signatures, and ignore duplicate message IDs to prevent replays.
- LLM parsing (Phase 2): treat message text as untrusted input. The model output must match a strict JSON schema with an allowlist of intents. The model cannot call tools or reach other data. The acting user always comes from the phone number mapping, never from message content. Limit message length.
- Questions on WhatsApp are answered from database queries, not from model text.
- The webhook route accepts form fields because Twilio sends them, so it is the one exception to "JSON only". The signature is checked before anything else, and an unset `TWILIO_AUTH_TOKEN` rejects every request.
- The public webhook host (a tunnel in development) is added to the trusted hosts from `PUBLIC_BASE_URL`. No other host is added.
- Outbound hosts added for Unit 09: `api.twilio.com` and `generativelanguage.googleapis.com`. The shared client uses timeouts, retries with backoff, and does not follow redirects.

## Supply Chain

- Commit lockfiles and pin versions. Add dependencies only when needed.
- CI runs `npm audit` and `pip-audit` and fails on high or critical findings. Dependabot or Renovate keeps versions current.
- Pre-commit and CI run a secret scanner (gitleaks).
- Use official package names. Review any new package before adding it.

## Security Checklist For Every Unit

- [ ] Every new route authenticates, validates input, and checks role and ownership.
- [ ] Every new table has RLS enabled, policies, and pgTAP tests for each role.
- [ ] No secret, full phone number, or ID data in code, logs, or responses.
- [ ] Rate limits and body size limits apply to new routes.
- [ ] No raw HTML rendering, no third-party script, no new hardcoded host.
- [ ] New outbound hosts are added to the allowlist deliberately.
- [ ] Dependencies added are justified, pinned, and pass the audit.
- [ ] The unit's acceptance criteria include at least one negative test (wrong role, other user's record, bad input).
