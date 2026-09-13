## 0.2.1 — AI connections and installer recovery

The installer now provisions a code-preview AI contributor and a read-only Production AI account. The local bridge authenticates each account, uses normal CMS access and lock hooks, binds private connection files to the site database, and provides check/context/request commands. The admin can export authenticated, credential-free current content and approvals for browser chats. Updated handoffs distinguish local runtime access from browser/cloud context.

Installer failures pause with a named step, reason, recovery instructions and Resume control. GitHub repository access is checked before databases are created; only the selected repository needs permission. Checkpoints survive restarting the installer; browser refresh preserves its session and non-secret details.

Verified locally: additive migration, typecheck, lint, 13 unit tests, 9 installer tests (including restart/resume without duplicate repository creation and CLI false-success detection), AI read-only/locks/publication regression tests, full AI bridge provisioning/check/context/read/write-denial smoke tests, production build, admin accessibility/context download and publishing browser tests, and installer recovery browser test. Full GitHub CI passed for fbc1cd8. The demo Preview deployment dpl_BgWeDxiR9cbueYCSEuVH2QdXQURT is Ready and serves the updated admin at the stable preview alias. RHP received a separate maintenance branch and review PR; its previously missing GitHub/Vercel connection was repaired and independently verified.

# Implementation status

## Scope and current phase

V5 supersedes V4. Phases 1, 2, 2B and 3 are complete within the foundation scope. Version 0.2 extends that foundation through explicit user requests below. Every public template is neutral verification scaffolding, not a company website design proposal. Phase 4 requires a new explicit instruction.

## Version 0.2 — publishing, approvals and independent installations

- One editorial workspace at `/admin`. Save to Preview captures an immutable whole-site snapshot; Publish to Live promotes the reviewed snapshot; Unpublish clears only the Live pointer. Forms and code deployments do not copy or replace Live content. `/preview` is the saved content preview in the same CMS; Vercel branch deployments are separate code-testing environments with separate resources.
- Theme, company settings, navigation and editable collections expose field approval states: default, approved and locked. Human approval controls own state changes. Server hooks reject changes to locked fields, including version restores. AI contributor accounts can edit unlocked fields but cannot unlock or publish. Referenced brand files and retained release files cannot be replaced or deleted through normal CMS operations.
- Admin colours use blue with white/grey in light mode and black/dark grey in dark mode. Native document publication labels now explain that they save to the workspace.
- The browser installer creates an independent private site repository, Vercel project, isolated Production/Preview databases and upload stores, administrator and starting page. Production initially shows Coming soon. Setup is resumable and refuses to overwrite existing unrelated folders or resources. Bootstrap passwords are used locally, never added to deployed environment variables, and removed from local setup files after completion.
- The public product uses the MIT license. Each generated website records hashes of its starting files. The upgrade command reviews upstream changes and stops on conflicts; applying a plan creates a separate branch without deployment, database changes or content replacement.
- Local verification: all migrations applied to a fresh disposable PostgreSQL database; seed and release/lock integration passed; 13 unit tests, seven installer tests and eight browser scenarios passed. Installer tests cover origin/token restrictions, shared-resource rejection before migration, setup completion, blocked deployments, GitHub-app account steps and upgrade conflicts. The production build, lint and type checks passed.
- Installer verification: an isolated private repository and Vercel project were provisioned through the real workflow, with two Neon databases and two Blob stores. Migrations, administrator initialization, Production and code Preview deployments, GitHub connection, bootstrap cleanup, checkpoint resume and the site's completion record succeeded. Browser verification passed on the installed Production site: administrator login, saved Preview, Live publication and unpublication. The smoke test caught a commit-author mismatch; the installer now uses the connected GitHub identity and reports blocked deployments explicitly. Setup screens also passed desktop/mobile and light/dark accessibility checks.
- Hosted app verification: revision 9508307 passed both GitHub CI runs and the hosted admin, font/logo and publishing/lock browser scenarios. Preview database migration passed after a private data snapshot. Temporary editors were removed and existing approval states restored. The demo is left unpublished with a saved content Preview at https://designos-preview-rockinghorse.vercel.app/preview; its admin remains at /admin. Deployment dpl_D8QpdTVdkHPAyiEjYC2ceuE8UsAt contains the verified app changes.
- Public source: RockingHorsePictures/website-designOS is public and a GitHub template. Its default branch is foundation/design-os. The existing Vercel project's production branch remains main, so publishing the template does not deploy the app into its unconfigured Production environment. All publishable Git history passed a secret scan before changing visibility.
- Current constraints: snapshots support release format 1 and up to 8 MB of content. Assets are conservatively retained by all stored releases; there is no release-pruning UI. Whole-site scheduled publication, email delivery/password reset, managed backups and custom domains remain launch configuration work. Code/database administrators must follow the AI contract; CMS locks cannot sandbox direct infrastructure access.

## Working foundation

- Requested admin presentation refresh: branded login and overview, task shortcuts, compact AI handoff, environment badges, grouped content/assets navigation, modern form/table styling, responsive light/dark presentation and visual colour pickers. These are admin-only changes; the public website remains neutral and no database schema change is required. Type checking, lint, production build and all seven local browser scenarios passed, including light/dark accessibility and mobile overflow checks. Both GitHub CI runs passed for application revision 7e4c03d. Hosted admin and font/logo scenarios passed on the same Preview release using a temporary editor, removed afterward. The asset check now allows bounded remote delivery delay while requiring HTTP 200 and an exact SHA-256 checksum; original settings are restored and test uploads removed.

- One Next.js/Payload application with PostgreSQL, migrations, idempotent demo seed, authenticated admin and administrator/editor roles.
- Structured Pages, Case Studies, Services, Team Members, Clients, Media and Approved Facts; navigation, company settings, semantic theme tokens and Search Profile globals.
- Drafts, versions, publishing/unpublishing, authenticated saved-draft preview, three responsive preview widths, and a constrained Puck composer with Intro, Selected Projects and CTA proof sections. Structured entity records remain in Payload; Puck stores references.
- Advisory quality panel with blockers, warnings and recommendations; evidence review, metadata and structured-data inspection. Invalid composition/URLs block publication. Full semantic claim analysis and exhaustive site crawling are deferred.
- Metadata defaults/overrides, canonical handling, robots/sitemap policies, redirects, structured data, verification hooks and optional best-effort IndexNow. AI provider contracts and opt-in alt-text suggestion infrastructure; runtime AI is disabled until a compatible provider is configured.
- GitHub CI, Vercel preview integration, dedicated Neon preview database and persistent Blob preview media, environment guards and operational documentation.

## Original foundation verification — 2026-09-13

- Fresh local migration and seed passed; Neon preview migration and seed passed.
- TypeScript production build and lint passed. Eleven unit tests passed.
- Integration tests passed for anonymous draft isolation, role escalation denial, unpublishing and scheduled publish/unpublish execution.
- All four browser scenarios passed locally and on the protected hosted Preview: responsive public/navigation/accessibility checks; real admin draft/preview/publish/redirect flow; anonymous API restrictions and noindex; Puck editing and draft/public separation.
- GitHub private repository created and connected to Vercel; both branch and draft-PR CI runs passed, including fresh PostgreSQL migration/seed, integration tests, production build and Linux browser tests. Draft PR: https://github.com/RockingHorsePictures/website-designOS/pull/1.
- Hosted Preview is READY: https://designos-preview-rockinghorse.vercel.app. Editor: /admin. Sign in to Vercel first, then use the CMS credentials in the ignored local file .local/preview-access.txt. Temporary bootstrap environment variables were removed after provisioning.
- Hosted authenticated upload passed. Media record 4 and the exact 274-byte PNG checksum survived replacement of deployment dpl_EgGi1n7DafMtbWfG8YFfV9QLjifi with dpl_6ffGVZbQhKes6ms4eczPF3qEdJHV. Both are Preview builds of application commit 34fb029 on foundation/design-os. Public page, editor and media persistence use real PostgreSQL and Blob storage.
- The hosted job endpoint successfully published and unpublished a persisted test page through authenticated invocation. Automatic clock-driven execution is a launch prerequisite below.
- Vercel's initial-deployment constraint was resolved using the user's explicitly approved, credential-free static bootstrap. Its public alias was removed and verified 404; its hashed URL remains protected. Subsequent branch builds correctly target Preview. Main and existing company production systems remain unchanged. See HOSTED_SETUP_REVIEW.md for the audit trail.
- Added and dry-run verified .vercelignore: local databases, credentials, caches and test artifacts are excluded from uploads. Git ignores alone were insufficient for this CLI.

## Architectural decisions affecting later design

- Next.js 16.3.5, Payload packages 3.89.0, React 19.3.0 and Puck 0.23.0, exact versions pinned.
- Payload is the only content source. Shared React section renderers serve the composer and public pages. Registry schemas constrain stored layouts and stable section IDs.
- Semantic colours, approved heading/body fonts and heading/body/emphasis weights are editor-controlled. Font sizes, spacing, motion, grids and responsive behaviour stay in code. The font controls were added by explicit follow-up request; no final website design has begun.
- Dynamic public rendering makes published changes visible without a deployment. Standard Payload live preview refreshes saved drafts; it does not stream unsaved normal-form keystrokes. Puck previews unsaved section changes directly.
- Globals save to the workspace with version history. Version 0.2 captures them together with content in whole-site Preview/Live releases.
- Separate Preview/Production database, storage and signing credentials are required. Current app resources are Preview only; real Production resources and the company application are not deployed. Only the approved static bootstrap occupies Vercel's initial Production slot.

## Known launch prerequisites / deferred scope

- The current Vercel Hobby preview has no automatic scheduled-job worker. The durable job framework is verified locally and through the hosted endpoint; configure an authenticated production scheduler before relying on timed publishing. Vercel Cron only executes in Production and minute intervals require a suitable plan.
- Configure production email delivery/password reset, backups/PITR and independent media recovery; operations documents provide the recovery procedure, not a claim those services are configured.
- Runtime AI, IndexNow and search-engine account integrations require their optional credentials. The full Search Assistant and content intelligence belong to later phases.
- Remaining moderate dependency advisories are in transitive migration tooling; see OPERATIONS.md.

## How a future design agent begins

The subsequent requested foundation extension adds a Font files upload library (WOFF2/WOFF, static or variable faces), custom body/heading font selection and standard weights 100–900, main/inverse logos and a browser icon in Site Settings, and an admin dashboard AI handoff. START_HERE.md and NEW_SITE.md explain where to work and how to export a clean starter for another company. The contract is now linked from AGENTS.md so a new task can discover it without this conversation. No website visual design has begun.

All six local browser flows pass, including font upload and persisted bytes, rejection of a disguised non-font, the Theme sample, public page, composer, main logo and icon. Thirteen unit checks, typecheck, lint, integration checks and the production build pass. The same upload/logo/handoff flow passes on the hosted Preview; original settings are restored and test uploads removed afterward. Both GitHub CI runs for application revision e46d626 passed. The AI handoff panel and download work without browser errors. Both additive migrations preserve existing values and are applied to local and Preview databases.

The clean starter contains 104 files with no source-site credentials, uploaded assets, repository connection or hosting links. It independently passed dependency installation, all four migrations, demo seeding into a separate local database, and a production build. It begins with one fresh demo administrator and no font/logo records. These checks establish repeatability of the foundation; each future site's hosting and credentials still need their own setup and verification.

The requested typography extension adds a live Theme sample, independently selectable heading/body fonts and heading/body/emphasis weights, with real self-hosted font files. Twelve unit checks, the production build, lint and all five local browser flows pass. The additive migration preserves existing theme values and versions with the original system-font defaults. See DESIGN_HANDOFF.md for the next design task's baseline, inputs and starting prompt.

Obtain explicit Phase 4 authorization, then read this status, V5, ARCHITECTURE.md and AI_SITE_CONTRACT.md. Run the existing tests and inspect the real editor before modifying templates. Obtain approved company references and visual direction. Extend shared sections and schemas together; preserve draft isolation, structured records and existing content migrations. Keep demo content clearly identified until approved content replaces it.
