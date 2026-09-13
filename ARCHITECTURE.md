# Implemented architecture

## Scope

Design OS only: V5 Phases 1, 2, 2B and 3. No final company website design is included.

## Data and rendering

- One TypeScript Next.js App Router app contains the public proof frontend and Payload `/admin` plus REST API.
- PostgreSQL stores users, content, drafts, version history, relationships, globals, jobs, redirects and AI budget counters.
- Payload collections: Pages, Case Studies, Services, Team Members, Media, Clients, Approved Facts, Redirects. Hidden AI Usage records enforce optional provider budgets.
- Globals: Navigation, Site Settings, Theme, Search Strategy.
- Capabilities are structured service subrecords initially. Sectors are planning context in Search Strategy. Dedicated taxonomies can be added later if real content justifies them.
- Public routes query Payload with access control and published mode. They are dynamically server-rendered, so successful publication appears on the next request with no deployment or cache-invalidation race. React request memoization deduplicates page/metadata reads.
- Case study, service and page URLs are derived from their slugs. Reserved infrastructure/index paths cannot be used as page slugs. Missing documents return 404; stored internal redirects return 308.

## Editor and preview

- Payload is the primary editing shell. Its forms support create, duplicate, draft, publish, unpublish, schedule and version restore.
- `/editor/[id]` is an authenticated Puck composer for Pages only. Three neutral sections prove the component contract: Introduction, Call to action, Selected case studies.
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

## Media and optional AI

- Local media lives in ignored `media/`; Vercel requires a Blob token. Uploads preserve metadata, focal point and responsive sizes. Vimeo stores videos; the CMS stores only references/posters/accessibility context.
- Images support editable alt text, decorative status, a per-use override, context and provenance/review status.
- `AIProvider` is server-only at runtime. The disabled provider leaves manual editing available. The optional HTTPS provider adapter expects `POST <AI_BASE_URL>/alt-text` with `{model,input:{image:{base64,mimeType},context,approvedFacts},rules}` and responds with `{text,reason?}`. This is a documented service contract, **not a direct OpenAI/Anthropic endpoint**. Supply an implementation before enabling it. No external AI generation has been verified without that service.
- Automatic upload suggestions are best-effort. Regeneration returns a suggestion for review; it does not save or publish. Manual text is never silently replaced. The atomic PostgreSQL daily counter bounds calls across instances; requests also have time, image-size and output-length limits.
- Provider interfaces exist for search performance, crawling, topics, web research and page performance. Full Search Intelligence UI/provider integrations belong to later phases and are not implemented here.

## Hosting separation

GitHub stores source and CI; Vercel runs Next/Payload; a managed PostgreSQL database stores content; Blob persists media. Each environment needs independent data, secrets and storage. `DATABASE_ENV` must match the deployment; preview refuses production-labelled data. This guard cannot detect intentionally mislabelled credentials: provisioning must supply genuinely separate resources.

See README for setup/deployment and OPERATIONS for recovery procedures and remaining external verification.
