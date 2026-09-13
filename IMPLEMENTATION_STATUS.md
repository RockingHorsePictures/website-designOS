# Implementation status

## Scope and current phase

V5 supersedes V4. Phases 1, 2 and 2B are implemented. Phase 3 hosted acceptance is in progress. STOP before Phase 4: every public template is neutral verification scaffolding, not a company website design proposal.

## Working foundation

- One Next.js/Payload application with PostgreSQL, migrations, idempotent demo seed, authenticated admin and administrator/editor roles.
- Structured Pages, Case Studies, Services, Team Members, Clients, Media and Approved Facts; navigation, company settings, semantic theme tokens and Search Profile globals.
- Drafts, versions, publishing/unpublishing, authenticated saved-draft preview, three responsive preview widths, and a constrained Puck composer with Intro, Selected Projects and CTA proof sections. Structured entity records remain in Payload; Puck stores references.
- Advisory quality panel with blockers, warnings and recommendations; evidence review, metadata and structured-data inspection. Invalid composition/URLs block publication. Full semantic claim analysis and exhaustive site crawling are deferred.
- Metadata defaults/overrides, canonical handling, robots/sitemap policies, redirects, structured data, verification hooks and optional best-effort IndexNow. AI provider contracts and opt-in alt-text suggestion infrastructure; runtime AI is disabled until a compatible provider is configured.
- GitHub CI, Vercel preview integration, dedicated Neon preview database and persistent Blob preview media, environment guards and operational documentation.

## Verification to date — 2026-09-13

- Fresh local migration and seed passed; Neon preview migration and seed passed.
- TypeScript production build and lint passed. Eleven unit tests passed.
- Integration tests passed for anonymous draft isolation, role escalation denial, unpublishing and scheduled publish/unpublish execution.
- Four browser scenarios passed: responsive public/navigation/accessibility checks; real admin draft/preview/publish/redirect flow; anonymous API restrictions and noindex; Puck editing and draft/public separation.
- GitHub private repository created and connected to Vercel; both branch and draft-PR CI runs passed, including fresh PostgreSQL migration/seed, integration tests, production build and Linux browser tests. Draft PR: https://github.com/RockingHorsePictures/website-designOS/pull/1.
- Hosted acceptance is pending Vercel's initial-deployment constraint: the platform classifies a new project's first deployment as Production even with Preview explicitly requested. Unintended builds were removed or failed without a running application; Production has no app credentials. A credential-free, unaliased bootstrap is prepared and awaits explicit user approval before further deployment attempts.
- Added and dry-run verified .vercelignore: local databases, credentials, caches and test artifacts are excluded from uploads. Git ignores alone were insufficient for this CLI.

## Architectural decisions affecting later design

- Next.js 16.3.5, Payload packages 3.89.0, React 19.3.0 and Puck 0.23.0, exact versions pinned.
- Payload is the only content source. Shared React section renderers serve the composer and public pages. Registry schemas constrain stored layouts and stable section IDs.
- Semantic colors are editor-controlled; typography, spacing, motion, grids and responsive behavior stay in code. No final design decisions have been made.
- Dynamic public rendering makes published changes visible without a deployment. Standard Payload live preview refreshes saved drafts; it does not stream unsaved normal-form keystrokes. Puck previews unsaved section changes directly.
- Globals save directly with version history; they do not have an independent draft-release workflow.
- Separate Preview/Production database, storage and signing credentials are required. Current resources are Preview only; Production is not provisioned or deployed by this run.

## Known launch prerequisites / deferred scope

- The current Vercel Hobby preview has no automatic scheduled-job worker. The durable job framework is implemented and locally tested; configure an authenticated production scheduler before relying on timed publishing. Vercel Cron only executes in Production and minute intervals require a suitable plan.
- Configure production email delivery/password reset, backups/PITR and independent media recovery; operations documents provide the recovery procedure, not a claim those services are configured.
- Runtime AI, IndexNow and search-engine account integrations require their optional credentials. The full Search Assistant and content intelligence belong to later phases.
- Remaining moderate dependency advisories are in transitive migration tooling; see OPERATIONS.md.

## How a future design agent begins

Obtain explicit Phase 4 authorization, then read this status, V5, ARCHITECTURE.md and AI_SITE_CONTRACT.md. Run the existing tests and inspect the real editor before modifying templates. Obtain approved company references and visual direction. Extend shared sections and schemas together; preserve draft isolation, structured records and existing content migrations. Keep demo content clearly identified until approved content replaces it.
