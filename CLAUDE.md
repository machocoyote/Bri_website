# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static website + order management dashboard for **Be Flourished Florist** (beflourishedflorals.com), hosted on GitHub Pages (branch: `main`, repo: `machocoyote/Bri_website`). No build step — vanilla HTML/CSS/JS only. No npm, no bundler.

## Deployment

Push to `main` on `machocoyote/Bri_website` → GitHub Pages auto-deploys to beflourishedflorals.com.  
Development branch: `claude/floral-business-website-6fArg`.  
Never push directly to main without user approval.

```bash
git push -u origin claude/floral-business-website-6fArg
```

## File structure

| File | Purpose |
|---|---|
| `index.html` | Public website — single-page with sections: hero, marquee, about, services, gallery, reviews (hidden until JSONbin populated), contact, footer |
| `styles.css` | All public site CSS. CSS variables in `:root`. Reviews section appended at bottom. |
| `script.js` | Public site JS: nav scroll, mobile menu, scroll reveal (IntersectionObserver), seasonal banner, contact form (Formspree), reviews fetch (JSONbin) |
| `dashboard.html` | Password-protected order management SPA. Views: overview, orders, calendar, reviews, settings |
| `dashboard.css` | Dashboard-only CSS. Brand CSS variables redefined at top. |
| `dashboard.js` | Dashboard logic: auth, orders CRUD (localStorage), calendar, reviews management (localStorage + JSONbin sync), email draft modals |
| `feedback.html` | Standalone customer feedback page — linked from thank-you emails |
| `feedback.css` | Self-contained CSS for feedback page (does NOT import styles.css; redefines `:root` vars) |
| `feedback.js` | Feedback form logic: URL param extraction, star rating hints, anonymous toggle, Formspree AJAX submit |
| `CNAME` | `beflourishedflorals.com` |

## Key external services

- **Formspree** — contact form (`ID: xeevnpgd`), feedback form (`ID: FEEDBACK_FORM_ID` placeholder in feedback.html — owner must replace)
- **JSONbin.io** — free public bin stores approved reviews JSON array. Dashboard writes via `X-Master-Key` header (PUT). Homepage reads publicly (GET, no key). Bin ID placeholder `YOUR_JSONBIN_BIN_ID` in script.js must be replaced after setup.

## Brand / design system

CSS variables (both `styles.css` and `dashboard.css` use these):
```
--bg: #0f0808  --bg2: #1a0f0f  --bg3: #221414
--gold: #c9956a  --gold-lt: #e0b48a  --gold-dk: #9e6a42
--cream: #f5ede4  --cream-dk: #d4c5b8
--border: rgba(201,149,106,0.25)
```
Fonts: Playfair Display (headings), Cormorant Garamond (body/italic), Lato (UI/labels).

## Dashboard architecture

- **Auth**: password stored in `localStorage` (key: `bf_pw`), session in `sessionStorage` (`bf_auth`).
- **Orders**: stored in `localStorage` (`bf_orders`), array of order objects.
- **Reviews**: stored in `localStorage` (`bf_reviews`), synced to JSONbin on approval changes.
- **JSONbin keys**: `bf_jsonbin_key` and `bf_jsonbin_bin` in `localStorage`.
- Order statuses: `New → Confirmed → In Progress → Ready → Delivered | Cancelled`.
- Customer-facing transitions (trigger email modal): `Confirmed`, `Ready`, `Delivered`.
- `Delivered` also shows thank-you email section with feedback link.

## Seasonal banner

`HOLIDAYS` array in `script.js` — each entry has `name, tagline, cta, windowDays, getDate(year)`, optional `pinned: true`. Mother's Day is pinned. Banner shows when today is within `windowDays` of the holiday. Dismissed via `sessionStorage`.

## Common tasks

**Add a new holiday to the banner**: append an entry to the `HOLIDAYS` array in `script.js` following the existing pattern.

**Replace Formspree feedback form ID**: in `feedback.html`, change `action="https://formspree.io/f/FEEDBACK_FORM_ID"`.

**Set JSONbin Bin ID for live reviews**: in `script.js`, replace `'YOUR_JSONBIN_BIN_ID'` with the actual bin ID. Also set the Master Key + Bin ID in dashboard Settings UI.

**Change dashboard password**: use the Settings tab in the dashboard UI, or set `localStorage.setItem('bf_pw', 'newpass')` in browser console.
