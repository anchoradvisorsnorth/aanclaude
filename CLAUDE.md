# CLAUDE.md — AAN Module

> Root context: Cowork\CLAUDE.md

---

## What AAN Is
Anchor Advisors North is Keith's part-time trust planning advisory brand. It is a consulting website — Keith offers a $2,900 advisory service for Indiana families who want guided estate planning rather than the DIY approach.

**Domain:** anchoradvisorsnorth.com
**Repo:** anchoradvisorsnorth/aanclaude
**Hosting:** Vercel (separate project: aanclaude)
**Email:** Google Workspace — keith@anchoradvisorsnorth.com
**Transactional email:** Resend — not yet set up for anchoradvisorsnorth.com domain

---

## Positioning Rules
- Keith is a "trust planning advisor" and "Indiana-licensed" on this site
- Do NOT use the word "attorney" in site copy — positioning is advisor, not legal counsel
- AAN references MTP as an entry option for those who want DIY first
- The $2,900 advisory service lives on AAN only — never mentioned on MTP

---

## Site Pages
| File | Purpose |
|------|---------|
| index.html | Homepage |
| how-it-works.html | Process explanation |
| who-we-serve.html | Target audience |
| about.html | Keith's background |
| inquire.html | Consultation request form |
| shared.css | Shared styles |

---

## Deploy
- Script: PUSH_AAN.bat + PUSH_AAN.ps1
- Repo: anchoradvisorsnorth/aanclaude
- Also: deploy.bat (legacy — confirm before using)

---

## Pending Work
1. **Wire inquiry form** — inquire.html consultation request form not yet connected to email
   - Set up Resend for anchoradvisorsnorth.com domain (separate from CivicScope Resend account)
   - Send from: info@anchoradvisorsnorth.com
   - Wire `fbq('track', 'Lead')` event on form submit at the same time
2. **AAN → MTP funnel link** — AAN should reference MTP as the DIY entry point

## Recent Changes (March 29, 2026)
- **GSC indexing fix** — All canonical tags, og:url, og:image, and JSON-LD urls standardized to `www.anchoradvisorsnorth.com` (was non-www, conflicting with Vercel's non-www → www 307 redirect). Created `vercel.json` with `/index.html` → `/` 301 redirect to eliminate duplicate canonical. Push script updated to include `vercel.json`. Deployed.

### Previous: March 28, 2026
- **SEO overhaul** — Meta descriptions added to 3 pages (who-we-serve, about, inquire). OG tags + canonical on all 5 pages. JSON-LD ProfessionalService schema on index.html, Person schema on about.html.
- **Meta Pixel installed** — Pixel ID `938566565699498` (shared with MTP for cross-site funnel tracking) on all 5 pages. PageView fires on every page. Lead event ready to wire when inquiry form is connected.
- **og-image.svg/png deployed** — 1200x630 OG image for social share previews.
- **PUSH_AAN.ps1 fix** — Stray quote on line 5 causing parse error, fixed.
- **Submitted to Google Search Console** — All 5 pages submitted for indexing.

---

## Relationship to MTP
MTP feeds into AAN — the checklist and workbook warm up prospects, then the most engaged ones consider the $2,900 AAN advisory service. They are separate brands with intentionally different positioning.

---

## Tech Stack Tracker (moved to CRM — April 23, 2026)
Tracker moved from `aanclaude.vercel.app/tracker` to `crm.jbkdevelopment.com/tracker`. AAN is a public-facing consulting brand; internal operational tools don't belong on that domain. CRM already has auth, Supabase, and cross-business context — it's the right home. See `CRM/CLAUDE.md` for current tracker details.
