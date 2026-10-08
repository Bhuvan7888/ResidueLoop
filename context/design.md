# Design

This file replaces `ui-context.md`. The visual reference is divinefarmer.com: a warm, editorial, earthy site with a cream canvas, near-black text, a mustard accent, serif display headings, and generous white space. ResidueLoop borrows its look and structure, not its content or assets.

Source notes: the palette and typefaces below come from a design gallery listing of the site (palette `#d6bd2c`, `#0b0b0a`, `#373f47`, `#faf6ef`, `#e0d0af`; fonts GT Alpina and SAA Series A). Layout patterns come from the page content. Status colors, spacing, and radii are not on the reference site and are defined here.

## Theme

Light only. No dark mode. The visual language is a warm editorial workspace: cream background, flat surfaces defined by thin tan borders, near-black text, and one mustard accent used for fills.

All colors are defined as CSS custom properties in `web/src/styles/index.css` and mapped to Tailwind tokens via `@theme inline`. Components must use these tokens. No hardcoded hex values or raw Tailwind color classes like `zinc-*`.

| Role             | CSS Variable           | Hex / Value                |
| ---------------- | ---------------------- | -------------------------- |
| Page background  | `--bg-base`            | `#faf6ef` (cream)          |
| Surface          | `--bg-surface`         | `#fffdf8`                  |
| Elevated surface | `--bg-elevated`        | `#ffffff`                  |
| Subtle surface   | `--bg-subtle`          | `#f1eadb`                  |
| Default border   | `--border-default`     | `#e0d0af` (tan)            |
| Subtle border    | `--border-subtle`      | `#ece3cf`                  |
| Primary text     | `--text-primary`       | `#0b0b0a`                  |
| Secondary text   | `--text-secondary`     | `#373f47` (slate)          |
| Muted text       | `--text-muted`         | `#5f656b`                  |
| Faint text       | `--text-faint`         | `#8a8d90` (disabled only)  |
| Brand accent     | `--accent-primary`     | `#d6bd2c` (mustard)        |
| Brand dim        | `--accent-primary-dim` | `rgba(214, 189, 44, 0.18)` |
| Brand text       | `--accent-primary-text`| `#7a6a00`                  |
| On brand         | `--on-accent`          | `#0b0b0a`                  |
| Error            | `--state-error`        | `#a63a2a`                  |
| Success          | `--state-success`      | `#3d6b4a`                  |
| Warning          | `--state-warning`      | `#8a5a00`                  |

Each state color also has a `-dim` fill at 10 percent opacity for badge backgrounds, for example `--state-success-dim`.

Tailwind utility names map to these variables:

| Utility                                                        | Variable                |
| -------------------------------------------------------------- | ----------------------- |
| `bg-base`                                                      | `--bg-base`             |
| `bg-surface`                                                   | `--bg-surface`          |
| `bg-elevated`                                                  | `--bg-elevated`         |
| `bg-subtle`                                                    | `--bg-subtle`           |
| `border-surface-border`                                        | `--border-default`      |
| `border-surface-border-subtle`                                 | `--border-subtle`       |
| `text-copy-primary`                                            | `--text-primary`        |
| `text-copy-secondary`                                          | `--text-secondary`      |
| `text-copy-muted`                                              | `--text-muted`          |
| `text-copy-faint`                                              | `--text-faint`          |
| `bg-brand`                                                     | `--accent-primary`      |
| `text-brand`                                                   | `--accent-primary-text` |
| `bg-accent-dim`                                                | `--accent-primary-dim`  |
| `text-on-brand`                                                | `--on-accent`           |
| `text-state-error`, `text-state-success`, `text-state-warning` | `--state-*`             |
| `bg-state-error-dim`, `bg-state-success-dim`, `bg-state-warning-dim` | `--state-*-dim`   |

### Color Rules

- Mustard is a fill color. It is never used as text or as a thin line on cream, because it fails contrast there. Text on mustard is always `text-on-brand`.
- Links and small accent text use `text-brand` (the darker mustard-brown).
- Every text and background pair meets WCAG AA (4.5 to 1 for body text). `text-copy-faint` is for disabled controls only.
- Status colors are used only for statuses (see Status Badges). Never for decoration.
- Primary button: `bg-brand` with `text-on-brand`. Secondary button: slate fill with cream text. Ghost button: tan border, no fill.
- The "via WhatsApp" tag has no accent hue. It uses `bg-subtle`, `text-copy-secondary`, and the `MessageCircle` icon.

## Typography

| Role               | Font                                   | CSS Variable        |
| ------------------ | -------------------------------------- | ------------------- |
| Display / headings | Serif, reference: GT Alpina            | `--font-display`    |
| UI / body          | Sans, reference: SAA Series A          | `--font-sans`       |
| Punjabi body       | Noto Sans Gurmukhi                     | `--font-gurmukhi`   |
| Punjabi headings   | Noto Serif Gurmukhi                    | `--font-gurmukhi-display` |

- GT Alpina and SAA Series A are licensed fonts. Until they are licensed, use the free stand-ins Fraunces (display) and Inter (body), loaded through fontsource packages, and keep the font names behind the CSS variables so swapping is a one-line change.
- Font stack for headings: `--font-display`, then `--font-gurmukhi-display`, then `serif`. Body: `--font-sans`, then `--font-gurmukhi`, then `system-ui`.
- Fonts are self-hosted. No third-party font CDN.
- Headings use the display serif. Everything else uses the sans.
- Scale: hero headline `text-5xl` on mobile to `text-7xl` on desktop, section headings `text-4xl`, card titles `text-xl`, body `text-base` (16px minimum on farmer screens), helper text `text-sm`.
- Eyebrow label above a section heading: small italic serif in `text-copy-secondary`, for example "How it works".
- Use `tabular-nums` for tonnes, amounts, and dates.
- Punjabi text uses slightly looser line height than English. Headings stay sentence case.

## Border Radius

Radius increases with surface depth. Smaller for inner elements, larger for outer containers.

| Context           | Class         |
| ----------------- | ------------- |
| Inline / small UI | `rounded-xl`  |
| Cards / panels    | `rounded-2xl` |
| Modal / overlay   | `rounded-3xl` |

Buttons, inputs, and badges use `rounded-xl`. Status badges may use `rounded-full`.

## Surfaces And Elevation

- Flat design. Surfaces are separated by `border-surface-border` and the cream-to-white step, not by shadows.
- Cards: `bg-surface`, `border`, `rounded-2xl`, padding `p-5` on mobile and `p-6` on desktop.
- Modals and sheets are the only elements with a shadow: one soft shadow plus a dark scrim.
- Generous white space. Section vertical padding is `py-16` on mobile and `py-24` on desktop for the login page. Dashboards use `gap-6` between cards.

## Responsive Behavior

- Farmer screens are mobile-first. Minimum supported width is 360px. Tap targets are at least 44px high. One primary action per screen.
- Buyer, donor, and NGO dashboards are desktop-first and remain usable on tablet width.
- Auth and form pages use a centered column with `max-w-md`. Dashboards use `max-w-5xl` or wider.

## Decorative Elements

- The reference uses monochrome rock and leaf cut-outs as decoration. ResidueLoop uses its own simple monochrome straw, leaf, and stone illustrations as inline SVG in `web/src/assets/decor/`.
- Decoration appears on the login page and in empty states only. It is `aria-hidden`, never carries meaning, and never sits behind text.
- Do not copy images or illustrations from divinefarmer.com.
- Motion is limited to a subtle fade and rise on section entry and a slow drift on login-page decoration. Respect `prefers-reduced-motion` by turning motion off.

## Status Badges

Every status uses an icon and a text label. Color is never the only signal.

| Status                     | Token             | Icon (Lucide)  |
| -------------------------- | ----------------- | -------------- |
| Verified                   | `state-success`   | `ShieldCheck`  |
| Fire detected              | `state-error`     | `Flame`        |
| Inconclusive               | `state-warning`   | `CloudOff`     |
| Pending (any)              | `copy-muted`      | `Clock`        |
| Received (payment)         | `state-success`   | `BadgeCheck`   |
| Not received (payment)     | `state-error`     | `CircleAlert`  |
| ID Rejected                | `state-error`     | `CircleX`      |
| Approved (support request) | `state-success`   | `CircleCheck`  |
| Declined (support request) | `copy-muted`      | `CircleX`      |
| Via WhatsApp               | `copy-secondary`  | `MessageCircle`|

## Map

MapLibre GL JS on a light, low-saturation basemap style so the cream interface and the map feel like one surface.

- Village markers: slate by default. Selected marker uses `--accent-primary` with a dark outline.
- Plot pin picker: single draggable pin with the village centre as the default.
- Wind-link map (donor): ranked villages shown as numbered markers with a line to the chosen city. Label the list "likely influence".
- Demand heatmap (Phase 2): demand in `--accent-primary`, forecast supply in `--text-secondary`, unfilled demand zones outlined in `--state-warning` and labelled in text.
- Individual plots are never drawn on any public or donor-facing map. Only village-level markers.

## Component Library

shadcn/ui on top of Tailwind. No custom design system. Components live in `web/src/components/ui/`. Use the `shadcn` CLI to add new components rather than writing them from scratch.

Components expected from shadcn: `button`, `input`, `input-otp`, `select`, `dialog`, `sheet`, `card`, `badge`, `table`, `tabs`, `progress`, `textarea`, `sonner` (toasts), `skeleton`, `dropdown-menu`, `form`.

Project-specific components built on top (not inside `ui/`, in `web/src/components/common/`): `PhoneOtpForm`, `RolePicker`, `StatusBadge`, `PoolProgress`, `OfferCard`, `PlotCard`, `LedgerTable`, `ActivityTimeline`, `LanguageSwitch`, `PageHeader`, `EmptyState`.

## Layout Patterns

- Navbar: top bar on the cream background with a bottom border. Brand wordmark on the left, role-specific links in the middle, language switch and account menu on the right. On small screens the links collapse into a `sheet`. Like the reference, keep it to a few short links.
- Login page (the hero): two columns on desktop. Left: eyebrow, large serif headline, one supporting sentence, and a short tagline. Right: a `rounded-2xl` card with the +91 phone field, then the 6-box OTP input with a visible resend countdown. On mobile the headline sits above the card. Decorative straw and leaf illustrations sit in the margins.
- Role picker: three large cards (Farmer, Buyer, Donor), each with a feature icon, one line of text, and a single tap to select.
- Dashboards: a vertical stack of `rounded-2xl` cards under a serif page title. The next action for the user is the first card.
- Detail views (pool detail, support request review): slide-over panel on the right on desktop, full-screen `sheet` on mobile.
- Map pages: full-viewport map with a floating overlay panel on the left. The overlay uses `bg-surface` with a subtle border.
- Modals and dialogs: centered overlay, `rounded-3xl`, `bg-elevated`, with a dark scrim.
- Activity and notification lists follow the reference's journal pattern: a title, one line of context, a date, and a text link.
- Footer: small, with legal links (Privacy, Terms) and a contact line. No newsletter block.
- Empty states: a `h-8 w-8` icon, one sentence, and one action.
- There is no separate marketing site. The login page carries the brand.

## Role Dashboards

| Role   | First card                              | Main sections                                                       |
| ------ | --------------------------------------- | ------------------------------------------------------------------- |
| Farmer | ID status, or the current offer         | Plots, listings, pool progress, payment status, verification, support requests, activity timeline |
| Buyer  | Pools ready for pickup                  | Demand posts, pools, pickups and weights, payment status, verification |
| Donor  | Donate to an NGO                        | NGOs, wind-link ranking, donation history, notifications            |
| NGO    | Pending support requests                | Funds ledger, request queue, disbursements, outcomes                |

## Content Rules

- Voice: plain, warm, and direct, like the reference's short statements. Short sentences. No jargon on farmer screens.
- Every user-facing string exists in English and Punjabi.
- Satellite results are stated as evidence, for example: "No fire detected and no burn scar found. Checked on 14 Nov." Never write "proved" or "guaranteed".
- Inconclusive says why (cloud cover or missed satellite pass) and that a recheck is scheduled.
- City air links say "likely influence". Never "caused by".
- Estimates (tonnes, PM2.5, tonnes per donation) are labelled "Estimate".
- Mocked behavior in the demo (ID review, payments, OTP) is labelled in the UI only where a user could mistake it for real. It is always stated in the pitch.

## Icons

Lucide React. Stroke-based icons only. No filled variants. Icon sizes: `h-4 w-4` for inline, `h-5 w-5` for buttons, `h-8 w-8` for feature icons in empty states.

Role and feature icons: `Wheat` (farmer), `Factory` (buyer), `HeartHandshake` (donor), `Building2` (NGO), `MapPin`, `Truck`, `Scale`, `Wind`, `Upload`, `ShieldCheck`, `Flame`, `MessageCircle`.
