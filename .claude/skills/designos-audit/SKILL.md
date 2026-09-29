---
name: designos-audit
description: Run a full website audit of a Design OS site — SEO, AEO/GEO (AI answer engines), structured data, content and claims, accessibility and site structure — then produce one prioritised action plan and optionally apply the safe fixes as workspace drafts. Use when asked to audit, review, optimise or health-check the website, its search visibility, AI visibility, schema or content.
---

# Design OS site audit

Combines measured data (crawler + CMS checks) with specialist review, then turns it into fixes an owner can approve.

## 1. Gather facts (do not skip)

1. `designos_check` (MCP) or `npm run ai:check` — confirm which environments are reachable. Production is read-only and authoritative.
2. Decide the URL to crawl. Prefer the **Production URL** for search/AI-visibility conclusions: previews and local sites are deliberately noindex, and the crawler skips launch-only checks there. Ask the owner if unsure.
3. `audit_site` with that URL (or `npm run audit -- <url>`). Note the report directory it prints.
4. `site_health` for the CMS environment (or `npm run ai:health -- <environment>`).
5. Read `cms_read` global `search-profile` (goals, audiences, questions, prohibited claims).

## 2. Specialist review (parallel)

Launch these subagents together in one message, passing each the report directory, environment and the owner's goals. Ask each for at most ~15 prioritised findings:

- `seo-auditor`
- `answer-engine-auditor`
- `schema-auditor`
- `content-reviewer`
- `accessibility-auditor`
- `structure-reviewer`

Skip ones the owner did not ask about (for example "just check the schema" → `schema-auditor` only).

## 3. One action plan

Merge and de-duplicate. Write `.designos/audits/<dir>/action-plan.md` with:

- A three-line summary: overall state, biggest risk, biggest opportunity.
- **Fix now** (blockers, broken links, indexing mistakes, false or unsupported claims).
- **Next** (high-impact improvements), then **Later**.
- For each item: evidence, who can do it (**Owner in the CMS** / **AI draft for approval** / **Developer code change**), the exact field or file, and effort.

Present the summary and the Fix-now list in chat, with the path to the plan.

## 4. Apply (only if the owner asks)

- Write only to the `preview` or `local` environment via `cms_write`. Changes land as workspace drafts; the owner reviews, saves a site Preview and publishes. You cannot publish, approve or delete, and must not try.
- Run `designos_context` first and skip locked fields; list them for the owner to unlock if needed.
- Factual copy must come from verified Approved Facts or the owner. Mark any AI-drafted claim and leave `claimsReviewed` for a person.
- Validate compositions with `validate_composition` before writing.
- Code changes (templates, schema generation) go on a feature branch with tests, following AI_SITE_CONTRACT.md.
- Re-run `audit_site` and `site_health` afterwards and report the before/after score.
