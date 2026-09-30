# Implemented architecture

## Scope

Design OS only: V5 Phases 1, 2, 2B and 3. No final company website design is included.

## Data and rendering

Version 0.2 introduces immutable JSON Site Releases and singleton Publication pointers. Snapshot creation runs in a repeatable-read transaction; publication and asset-retention operations use transaction-scoped advisory locks. Publishing checks the reviewed Preview ID; concurrent/stale operations fail rather than replacing an unseen version. Public rendering resolves relationships from the selected snapshot, including metadata, redirects, navigation, font metadata and crawler settings. Referenced source workspace edits do not change snapshot content. Asset replacement/deletion is rejected once an asset belongs to a release. Releases currently have conservative unlimited retention; a future retention workflow must verify references and backups before removing any assets.

The public URL renders Live; /preview renders the fixed Preview; /workspace-preview requires an authenticated draft session to render mutable working drafts. The proxy overwrites the internal view header so callers cannot spoof it. The same deployment owns /admin and both content channels. A separate Vercel Preview deployment still has an isolated test database and must never be bound to the real Production database.

Protection metadata is stored alongside content and globals. Saved schema defaults, explicit human approval and locked states are distinct. CMS hooks reject locked writes and unauthorized policy changes, even with local API access overrides. A dedicated policy route uses a server-only approval marker and optimistic record timestamps. AI contributor accounts cannot approve or publish. These controls are not a sandbox against an infrastructure administrator editing code or issuing direct SQL; the repository contract governs privileged coding agents.

- One TypeScript Next.js App Router app contains the public proof frontend and Payload `/admin` plus REST API.
- PostgreSQL stores users, content, drafts, version history, relationships, globals, jobs, redirects and AI budget counters.
- Payload collections: Pages, Case Studies, Services, Team Members, Media, Clients, Approved Facts, Redirects. Hidden AI Usage records enforce optional provider budgets.
- Globals: Navigation, Site Settings, Theme, Search Strategy and internal Publication channel pointers. Site Releases store immutable content snapshots.
- Capabilities are structured service subrecords initially. Sectors are planning context in Search Strategy. Dedicated taxonomies can be added later if real content justifies them.
- Public routes read immutable site release snapshots through siteCMS(). Workspace collections and globals require authentication. They are dynamically server-rendered, so successful publication appears on the next request with no deployment or cache-invalidation race. React request memoization deduplicates page/metadata reads.
- Case study, service and page URLs are derived from their slugs. Reserved infrastructure/index paths cannot be used as page slugs. Missing documents return 404; stored internal redirects return 308.

## Editor and preview

Theme typography uses a stable approved-font registry and CSS variables shared by the public layout, Puck preview root and live admin sample. Inter, Source Sans 3 and Lora are self-hosted through pinned Fontsource variable packages with normal/italic faces; system stacks are also available. The additive typography migration supplies the original system-font defaults to existing globals and their versions. Adding a font must update the registry, bundled assets and enum migration. CMS values never supply raw CSS or external stylesheet URLs.

- Payload is the primary editing shell. Its forms support create, duplicate, draft, workspace save, schedule and version restore. Whole-site publication is a separate Overview action.
- `/editor/[id]` is an authenticated Puck composer for Pages. Seventeen neutral base sections (docs/SECTIONS.md) share one contract: zod schema and metadata (`src/editor/registry/schema.ts`), composer fields (`config.tsx`) and plain React renderers (`src/components/sections`) used by both the composer and the public site. Sites add bespoke sections the same way. `src/components/site/Sections.tsx` resolves referenced records and media from the selected release. Long text uses a safe Markdown subset rendered to React elements, never raw HTML.
- The JSON field is replaced with a human-readable outline and composer link. Authors do not edit JSON.
- The composer saves drafts through an authenticated same-origin endpoint and detects stale saves using the document update timestamp. It does not publish. Reopen the normal page editor for QA and publication.
- Puck previews the real shared components at 390/768/1440px. Entity fields save IDs. Structured summaries are fetched separately for preview.
- `/api/preview` checks the user's Payload session, collection and document, enables Next draft mode, then redirects to a server-derived content path. Every subsequent draft read checks authentication again. Saved changes refresh live preview via Payload's route-refresh integration. Puck changes preview immediately inside the composer.
- This initial implementation previews saved CMS drafts; arbitrary unsaved edits in standard Payload forms are not streamed into public templates.

## Search and publication

- Shared Search fields provide title, description, canonical, noindex, social image/title/description, topic, intent and questions.
- Metadata falls back to the document title/summary and Site Settings. Structured data generates Organization, WebSite, BreadcrumbList, WebPage, Service, ImageObject and eligible VideoObject entries from visible fields.
- Staging/local environments send noindex headers and deny crawling. Production sitemap excludes drafts, demo content, noindex and non-self canonicals.
- Search discovery is enabled by default in production; model-training crawlers are denied by default. Search Strategy can change either policy independently.
- Published slug changes create redirects. IndexNow notifications are best-effort after publication/deletion and never block editing; a public key endpoint supports ownership validation.
- The pre-publish panel checks the current form's values and separates blockers, warnings and recommendations. Invalid titles/slugs/sections are also rejected on publish server-side. Factual review is advisory and requires human judgment; this is not a claim-verification engine.
- Scheduled publication uses Payload's native `schedulePublish` job. Local development has a minute worker; hosted jobs run on an authenticated endpoint. The Preview worker was verified through explicit invocation. Automatic timed execution requires a production scheduler; minute-level Vercel Cron requires a suitable plan and never runs on Preview deployments.

## Enquiries

Contact and Form sections post to `/api/forms/[id]` (`contact` for the built-in Contact form, or a Forms collection ID), rendered by `SiteForm`. It accepts JSON or a plain form POST (so it works without JavaScript), checks origin, a hidden trap field, a minimum fill time, Turnstile when configured and atomic per-sender and site-wide rate limits, validates against the released form definition, stores a Form Submission and sends optional SMTP notifications and signed webhooks. Submissions are readable by admin/editor roles only and never enter releases or AI context.

## AI toolkit

- `scripts/ai.mjs` + `scripts/ai-client.ts`: restricted CMS bridge (check, context, request, health) for production (read-only), preview and local profiles. Each profile verifies its own database identity and account scope.
- `scripts/mcp.mjs`: dependency-free stdio MCP server wrapping the bridge, the section catalog/validator (`scripts/sections.ts`), site health (`src/lib/site-audit.ts`) and the crawler (`scripts/audit.ts` + `src/lib/audit/analyze.ts`).
- `.claude/skills` and `.claude/agents`: Claude Code workflows and read-only specialist reviewers. See docs/AI_TOOLKIT.md.
- Discovery: robots.txt has separate groups for search engines, AI answer engines and AI training crawlers (`src/lib/search/crawlers.ts`); `/llms.txt` lists the release's indexable pages; IndexNow is notified with the changed paths when a release goes Live, not on workspace saves.

## Media and optional AI

- Brand identity is in Site Settings: main logo, inverse logo and browser icon reference the image library. The neutral header and metadata consume main logo/icon; the inverse logo is available for later design work.
- Font files are a separate authenticated upload collection with public read/file delivery, WOFF2/WOFF header and size validation, weight ranges and styles. Local files use ignored `font-files/`; hosted files use the existing persistent Blob adapter. Theme relationships select a family's faces for body/headings; shared `CustomFonts` and typography tokens render them in the website, composer and live Theme sample. Family names and file routes are derived safely, not accepted as raw CSS.
- START_HERE.md and AGENTS.md carry the AI workflow across tasks. The dashboard's handoff uses non-secret site-workspace.json repository/branch metadata. The starter exporter copies committed foundation files into a new folder and resets site-specific setup details; it does not copy data, secrets or hosting links or provision resources.

- Local media lives in ignored `media/`; Vercel requires a Blob token. Uploads preserve metadata, focal point and responsive sizes. Vimeo stores videos; the CMS stores only references/posters/accessibility context.
- Images support editable alt text, decorative status, a per-use override, context and provenance/review status.
- `AIProvider` is server-only at runtime. The disabled provider leaves manual editing available. The optional HTTPS provider adapter expects `POST <AI_BASE_URL>/alt-text` with `{model,input:{image:{base64,mimeType},context,approvedFacts},rules}` and responds with `{text,reason?}`. This is a documented service contract, **not a direct OpenAI/Anthropic endpoint**. Supply an implementation before enabling it. No external AI generation has been verified without that service.
- Automatic upload suggestions are best-effort. Regeneration returns a suggestion for review; it does not save or publish. Manual text is never silently replaced. The atomic PostgreSQL daily counter bounds calls across instances; requests also have time, image-size and output-length limits.
- Provider interfaces exist for search performance, crawling, topics, web research and page performance. Full Search Intelligence UI/provider integrations belong to later phases and are not implemented here.

## Hosting separation

GitHub stores source and CI; Vercel runs Next/Payload; a managed PostgreSQL database stores content; Blob persists media. Each environment needs independent data, secrets and storage. `DATABASE_ENV` must match the deployment; preview refuses production-labelled data. This guard cannot detect intentionally mislabelled credentials: provisioning must supply genuinely separate resources.

See README for setup/deployment and OPERATIONS for recovery procedures and remaining external verification.

## Version 0.4 additions

- **Languages**: Payload field localization over a fixed list of supported codes (`src/lib/locales.ts`); Site Settings enables languages per site and `filterAvailableLocales` shows only those in the admin. Releases keep the main language at the top level and a complete body per extra language under `translations`, captured with fallbacks applied, so rendering is unchanged and older app versions can still read format 1. The proxy strips `/<code>/` and sets `x-designos-locale`; `siteCMS()` serves the matching body; metadata emits canonical and `hreflang` alternates; the sitemap lists every language.
- **Blog**: Posts and Categories collections, `/blog` (paginated), `/blog/category/<slug>`, `/blog/feed.xml`, BlogPosting data and a Posts section. **Search**: `/search` scores release documents in memory (`src/lib/site-search.ts`).
- **Forms**: a Forms collection (field builder), a Form section, and `/api/forms/[id]` for builder and Contact forms. Definitions are released; delivery settings (notifications, signed webhooks with private-address blocking, redirects) stay in the workspace and are human-only. Rate limits use an atomic Postgres upsert (`src/lib/rate-limit.ts`). Optional Cloudflare Turnstile.
- **Layout**: Columns (Puck slots), Reusable blocks (a collection plus a GlobalBlock section), page templates, motion presets, announcement bar, editable 404, password-protected pages (scrypt hashes; signed per-page cookie), generated share images (`/og`, text from the Live release only).
- **Sign-in**: Google OpenID Connect (PKCE, state, nonce, JWKS verification) for invited users, creating a native Payload session (`src/lib/auth/session.ts`), so logout and refresh behave normally. `PASSWORD_SIGN_IN` limits password login. The first administrator is created at `/setup` behind `DESIGNOS_SETUP_CODE`; anonymous first-user registration is blocked.
- **Hosting**: `src/lib/env-defaults.mjs` derives environment labels from Vercel and secrets from the site's own database credentials; `scripts/vercel-build.mjs` migrates each deployment's database before building; the Design OS updates Action opens update pull requests (`scripts/upgrade.mjs latest --pr`).
- **Assets**: releases keep only media and fonts that released content references; anonymous visitors can read only those (Live or Preview), and internal media fields are staff-only.
- **Admin**: the Overview dashboard (`src/editor/Dashboard.tsx`, `/api/dashboard`), new-page and invite dialogs, a refreshed stylesheet (`src/styles/admin-refresh.css`) and a standalone composer layout.

## Package decisions

Core versions are pinned in package.json and package-lock.json. Payload packages all use 3.89.0; Next.js 16.3.5 and Puck 0.23.0 were checked against official compatibility documentation and package peer requirements. React 19.3.0 and sharp 0.35.4 include current fixes. ESLint 9 is retained because the current Next.js lint plugins do not yet accept ESLint 10; revisit when their peers support it. Embedded Postgres is local development tooling only. Remaining transitive audit findings are documented in docs/OPERATIONS.md.
