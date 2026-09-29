---
name: designos-launch-check
description: Pre-launch and post-launch readiness check for a Design OS website — production configuration, domain, email, backups, crawler policy, audits, content sign-off and the release itself. Use before going live, after a domain change, or when asked "is the site ready to launch?".
---

# Launch readiness

Report each item as ✅ verified (say how), ⚠️ needs the owner, or ❌ blocking. Do not mark anything verified from configuration files alone.

**Content and approvals**

- `site_health` on Production: no blockers; demo content removed or excluded (`demo` flags); homepage, contact route and legal pages exist.
- Every claim has a verified Approved Fact; `claimsReviewed` was ticked by a person on records with AI-assisted claims (`content-reviewer` helps).
- Key brand values (logo, colours, fonts) are approved and, if the owner wants, locked.

**Configuration** (read environment names only; never print secret values)

- `SITE_ENV`/`DATABASE_ENV` = production, and separate Production database and Blob store (OPERATIONS.md).
- `NEXT_PUBLIC_SERVER_URL` is the final domain; the custom domain is attached in Vercel and redirects www/apex consistently.
- SMTP configured (`SMTP_HOST`…) so password reset and enquiry notifications work; send a test enquiry through a Contact section and confirm it arrives and appears under Enquiries.
- Backups/point-in-time recovery enabled with the database provider; media backup plan (OPERATIONS.md).
- Optional: `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`, `INDEXNOW_KEY`.

**Discovery**

- Search Strategy crawler choices confirmed with the owner: search engines, AI answer engines, AI training crawlers.
- After publishing: `audit_site` on the Production URL. Robots allows the intended bots, sitemap lists the pages, `/llms.txt` present, canonical URLs use the final domain, no noindex on live pages.
- Submit the sitemap in Google Search Console and Bing Webmaster Tools (owner action).

**Release**

- The owner saves a site Preview, reviews `/preview` on mobile and desktop, then publishes to Live from Overview. Confirm Live renders and a later workspace edit does not change it until the next publish.

Finish with a short list of what the owner must do, in order.
