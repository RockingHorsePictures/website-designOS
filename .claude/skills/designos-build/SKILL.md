---
name: designos-build
description: Start or continue building a bespoke website on Design OS — brief intake, sitemap, visual direction (optionally via Claude Design), bespoke React sections wired to the CMS, page composition and verification — so the owner ends up with a unique site they can edit themselves. Use when the owner asks to design, build, redesign or extend their website.
---

# Build a bespoke Design OS website

The goal is a site that looks and feels made for this company, on a structure the owner can manage afterwards without AI: edit copy, swap images, add pages and rearrange sections in the CMS.

**Bespoke first.** The base section library (`npm run sections -- catalog`) is a safety net for post-launch editing, not a template. Do not start from it or design around it. Design the site the brief deserves, then express each distinctive part as an editable section (see `designos-new-section`). Reuse a base section only where it genuinely fits the design, restyled to match.

## 0. Ground rules (read once per session)

- Read `AI_SITE_CONTRACT.md` and `START_HERE.md`. Run `designos_check` then `designos_context`; respect locked fields and Production approvals.
- The owner must explicitly authorise design work. If they have not, ask.
- Never invent facts, clients, results, awards or locations. Missing facts are questions or clearly marked placeholders.
- Work on a feature branch. Production stays unchanged until a separate release decision.

## 1. Brief

Collect or confirm, and record what you learn in the Search Strategy global (`cms_write` to `search-profile`): company and proposition, audiences and their questions, goals and primary actions, tone, approved terminology and prohibited claims, competitors or references with what the owner likes and dislikes, required pages and functions, brand assets (logo, fonts, imagery), constraints (accessibility, languages, budget for motion). Ask for approved facts; add them as Approved Facts with sources, left as `pending` for a person to verify.

## 2. Structure

Propose a sitemap and a content-to-template map: which content is structured records (Services, Case Studies, Team, Clients) versus composed Pages. Use `structure-reviewer` for a second opinion on a large site. Get the owner's approval before designing.

## 3. Visual direction

Offer the owner a choice:

- **Direct in Claude Code (default).** Produce two or three distinct directions as real, rendered pages: homepage hero plus one inner template, on mobile and desktop. Take screenshots and iterate.
- **Claude Design exploration (optional).** Useful when the owner wants to explore many visual options quickly or collaborate visually. Run `designos-import-design` step 1 to prepare a brief that keeps designs within the editable structure. After the owner exports or hands off from Claude Design, continue with `designos-import-design`.

Agree one direction on the homepage, one service and one case study (mobile and desktop) before building everything.

## 4. Build

1. Theme: set colour tokens and fonts in the CMS (Theme global; upload licensed WOFF2 files to Font files). Locked tokens are off limits.
2. Global layout: header, navigation, footer in `src/app/(frontend)/layout.tsx` and a site stylesheet. Replace the neutral `src/styles/proof.css` look; keep its accessibility and reduced-motion rules.
3. Sections: implement each distinctive block as a registered section (`designos-new-section`). Restyle any base sections you keep.
4. Templates: case study, service and index templates in `src/components/site/` keep their data contracts.
5. Content: compose pages with `list_sections`, `validate_composition` and `cms_write` (drafts in `preview` or `local`). Upload approved images with `cms_upload_image` and real alt text.

## 5. Verify

`npm run typecheck && npm run lint && npm test && npm run build`, then the browser tests. Check the composer can add, edit and reorder every section, `/workspace-preview` shows drafts, and a site Preview renders. Run `designos-audit` against the preview for accessibility, schema and content. Hand over with a short owner guide to what they can now edit (update EDITOR_GUIDE.md if new sections need explanation).
