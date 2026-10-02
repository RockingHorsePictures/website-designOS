## 0.2.1 — AI connections and installer recovery

The installer now provisions a code-preview AI contributor and a read-only Production AI account. The local bridge authenticates each account, uses normal CMS access and lock hooks, binds private connection files to the site database, and provides check/context/request commands. The admin can export authenticated, credential-free current content and approvals for browser chats. Updated handoffs distinguish local runtime access from browser/cloud context.

Installer failures pause with a named step, reason, recovery instructions and Resume control. GitHub repository access is checked before databases are created; only the selected repository needs permission. Checkpoints survive restarting the installer; browser refresh preserves its session and non-secret details.

Verified locally: additive migration, typecheck, lint, 13 unit tests, 9 installer tests (including restart/resume without duplicate repository creation and CLI false-success detection), AI read-only/locks/publication regression tests, full AI bridge provisioning/check/context/read/write-denial smoke tests, production build, admin accessibility/context download and publishing browser tests, and installer recovery browser test. Full GitHub CI passed for fbc1cd8. The demo Preview deployment dpl_BgWeDxiR9cbueYCSEuVH2QdXQURT is Ready and serves the updated admin at the stable preview alias. RHP received a separate maintenance branch and review PR; its previously missing GitHub/Vercel connection was repaired and independently verified.

# Implementation status

## Scope and current phase

V5 supersedes V4. Phases 1, 2, 2B and 3 are complete within the foundation scope. Version 0.2 extends that foundation through the explicit user requests below. Versions 0.3 and 0.4 add the section library, AI toolkit and platform features. Every public template is neutral verification scaffolding, not a company website design proposal. The visual website design phase for any company begins only on a new explicit instruction.

## Version 0.4 (unreleased, branch `feature/v0.4-platform`, stacked on 0.3) — platform

Requested by the owner on 2026-09-30:

- an overhauled, animated admin experience;
- simple installation and updates (Deploy Button; database migrated on deploy; updates as pull requests);
- a review of the contact form and its integrations;
- a security review;
- Google sign-in with a password fallback;
- a Webflow/Framer-class feature set (blog and search, layout power, forms and integrations, multi-language, plus anything else AI can build and control);
- simplified documentation;
- a final audit.

**Added**

- **Languages**: field localization for 26 supported codes; languages switched on per site; `/<code>/` routes; `hreflang`; per-language releases; composer language switching.
- **Blog**: Posts and Categories, index, category pages, RSS, BlogPosting data and a Posts section.
- **Site search**: `/search`.
- **Forms**: a form builder, a Form section, signed webhooks, per-form notifications and redirects, optional Turnstile, and atomic rate limits.
- **New sections**: Columns (nesting), Reusable blocks, Steps, Pricing and Embed (allowlisted providers).
- **Page options and site chrome**: motion presets; page templates; password-protected pages; announcement bar; analytics (Vercel, Plausible, Fathom, Umami, or GA4 behind cookie consent); verification codes and an editable 404 in Site Settings; generated share images.
- **Sign-in and setup**: Google sign-in for invited users (native Payload sessions); `PASSWORD_SIGN_IN`; `/setup` behind `DESIGNOS_SETUP_CODE`, with anonymous first-user registration blocked.
- **Admin**: the Overview dashboard (status, stats, checklist, recent edits, quick actions, New page and Invite dialogs, update banner), a refreshed admin theme with motion (reduced-motion safe), a redesigned sign-in page and a standalone composer.
- **Hosting**: the Deploy Button (Neon + Blob), hosted environment defaults, migrate-on-deploy (the product repository opts in), and the weekly updates Action opening pull requests.
- **Docs**: reorganised into `docs/`, with the new `docs/DEPLOY.md`.

**Security fixes from review**

- Anonymous visitors could list every media file, including internal notes and unreleased uploads. Now only released files are readable, and internal fields are staff-only.
- The contact form's no-JavaScript redirect was an open redirect.
- The session cookie lacked `Secure`. It is now set outside local development.
- No CSP, HSTS or Permissions-Policy. Baseline headers are now sent.
- The form rate limit could be raced and spoofed. It is now atomic and uses platform client-IP headers.
- Login and password reset had no IP throttle. They now do.
- Raw errors were returned from the approval and publication APIs. They are now sanitised.
- AI accounts could edit their own login details, and could set analytics, verification or form delivery fields. All of these are now blocked.
- The starter exporter omitted the 0.3 AI toolkit files. Its allowlist is fixed.

**Migrations**

- `20260930_000010_blog_forms_blocks_access` is additive (including `designos_rate_limits`).
- `20260930_000113_localization` moves translatable columns into `*_locales` tables. It is hand-edited to copy every value first. It was verified on the local database: 129 values in pages, case studies, services, team, media, site settings and navigation matched their pre-migration release copies, with 0 mismatches.
- Deploying it drops old columns, so the previous deployment can error briefly during the switch. Release at a quiet time and confirm Neon backups.

**Final audit fixes**

- Reads in the signed-in workspace preview now always run as the signed-in person. Before, categories, reusable blocks and forms could come back empty when draft mode was off.
- Routes that don't load the Payload config (Google sign-in, page passwords, rate limits) now apply the hosted environment defaults first. Before, derived secrets could differ.
- The Google redirect address now follows the address the person is signing in on (for example a preview URL), not only the configured site address.
- Forms:
  - Forms submit the address the visitor is actually on, so redirects stay in the same language and preview.
  - After-send redirects get the same prefixes.
  - Without JavaScript, errors are shown on return.
  - Workspace previews use the unpublished form.
  - A failed webhook status update no longer fails the submission.
- Editors see password-protected pages in the workspace preview without entering the password.
- The list of released file IDs is cached per publication state. Before, every image request re-queried every release.
- `llms.txt` links, the RSS link and the 404 search form keep the current language and preview.
- Updates:
  - Deploy Button sites (which have no installation file) are compared against the full release tree, not the starter export.
  - Automated update pull requests no longer try to change `.github/workflows` files, which GitHub Actions tokens can't do. They're listed in the pull request for a person to copy.
  - The version is now 0.4.0.
- A reported issue about protected pages being readable through the REST API was checked and is not a bug: anonymous `/api/pages` returns 403.

**Release prerequisites**

- Each release moves the `stable` branch to its tag; the README's Deploy Button clones `stable`.
- The localization migration drops columns. Existing sites should take a Neon backup before deploying 0.4.

## Version 0.3 (unreleased, branch `feature/v0.3-toolkit`) — section library, forms and AI toolkit

Requested by the owner on 2026-09-29: audit and fix the app, make it a complete framework for bespoke AI-built sites that owners can self-manage, add AI auditing (SEO, AEO, GEO, schema, content, structure), orient tooling to Claude (Claude Code, Desktop, Cowork) while staying tool-neutral, and make Claude Design an optional stage. The owner approved a neutral base section library on the condition that it must not steer design; the contract now states "bespoke first".

**Fixes (from a code audit, each verified against the code):**

- Version restore always failed after later edits, because the old approval record was compared; restores now keep current approvals and locks (collections and globals). Regression tests cover restore under a lock.
- AI contributor accounts could verify Approved Facts, approve reference URLs, tick "claims reviewed" and delete records. These are now human-only; AI edits reset a person's approval stamp to default.
- Renaming a published page back to its old slug failed with a redirect loop; stale redirects are removed and chains collapsed.
- IndexNow fired on workspace/draft saves (the local API never sets `req.query.draft`); it now notifies the changed or removed paths when a release goes Live.
- `preview`/`workspace-preview` were accepted as page slugs but unreachable; they are reserved.
- The release asset-retention check loaded every snapshot on each media edit; it is now one JSONB containment query.
- The installer corrupted `.env` values containing `"` (`JSON.stringify` is not reversed by `parseEnv`); quoting now round-trips, and unstorable passwords are refused up front.
- Preview deployments inherited the Production `NEXT_PUBLIC_SERVER_URL`; they now fall back to their own Vercel address.
- First-party media URLs (absolute, via serverURL) crashed `next/image` for local/non-Blob storage; they are served same-origin.
- The alt-text endpoint spent AI budget before validating the request; bootstrap admin creation could race on cold starts; the upgrade planner missed CRLF normalisation for `LICENSE`.

**Added:** 17-section base library with composer fields, pickers for media/records/facts, Markdown-subset text, and `pageHeader: hidden`; Contact sections with an Enquiries collection (spam trap, rate limit, no-JS fallback, optional SMTP notifications, which also enable password reset); Site Settings address/language/organisation type; separate answer-engine crawler toggle; `/llms.txt`; richer JSON-LD (organisation details, three-level breadcrumbs, CreativeWork, FAQPage and VideoObject from visible sections, CollectionPage/ItemList, AboutPage/Person); `html lang`; index/team metadata; section-aware quality checks; admin **Site health**; crawler audit (`npm run audit`); section catalog/validator; MCP server; Claude Code skills and subagents; `local` bridge profile, `ai:health` and image upload; docs/AI_TOOLKIT.md and docs/SECTIONS.md.

**Migration:** `20260929_204851_sections_forms_answer_engines` is additive (new table and columns with defaults). Existing compositions validate unchanged; a unit test pins 0.2 compositions.

**Verified locally (2026-09-29, Windows, embedded PostgreSQL 18):** migration on the existing local database; typecheck, lint, production build; 36 unit tests; 11 installer tests; integration, release and AI-access suites (including new restore, rename, fact-verification, delete and approval-stamp regressions); 10 Playwright scenarios against the production build, including axe on the section library, the composer and Site health; contact form (stored, honeypot, validation, origin rejection, rate limit, no-JS 303); MCP initialize/list/call over stdio; crawler audit against the local site.

**Not yet verified:** GitHub CI and a hosted Preview deployment of this branch (pending push), SMTP delivery with a real provider, Claude Desktop/Cowork registration of the MCP server on a clean machine, and a Claude Design handoff end to end (its bundle format is not publicly specified, so the import skill inspects whatever arrives). No release has been cut; the installer still points to v0.2.1.

**Upgrade note:** sites that already customised `src/editor/registry/*` or `src/components/sections/*` will see upgrade conflicts for review (by design). Keep their section types and props, and merge the new registry structure.

## Version 0.2 — publishing, approvals and independent installations

- One editorial workspace at `/admin`. Save to Preview captures an immutable whole-site snapshot; Publish to Live promotes the reviewed snapshot; Unpublish clears only the Live pointer. Forms and code deployments do not copy or replace Live content. `/preview` is the saved content preview in the same CMS; Vercel branch deployments are separate code-testing environments with separate resources.
- Theme, company settings, navigation and editable collections expose field approval states: default, approved and locked. Human approval controls own state changes. Server hooks reject changes to locked fields, including version restores. AI contributor accounts can edit unlocked fields but cannot unlock or publish. Referenced brand files and retained release files cannot be replaced or deleted through normal CMS operations.
- Admin colours use blue with white/grey in light mode and black/dark grey in dark mode. Native document publication labels now explain that they save to the workspace.
- The browser installer creates an independent private site repository, Vercel project, isolated Production/Preview databases and upload stores, administrator and starting page. Production initially shows Coming soon. Setup is resumable and refuses to overwrite existing unrelated folders or resources. Bootstrap passwords are used locally, never added to deployed environment variables, and removed from local setup files after completion.
- The public product uses the MIT license. Each generated website records hashes of its starting files. The upgrade command reviews upstream changes and stops on conflicts; applying a plan creates a separate branch without deployment, database changes or content replacement.
- Local verification: all migrations applied to a fresh disposable PostgreSQL database; seed and release/lock integration passed; 13 unit tests, seven installer tests and eight browser scenarios passed. Installer tests cover origin/token restrictions, shared-resource rejection before migration, setup completion, blocked deployments, GitHub-app account steps and upgrade conflicts. The production build, lint and type checks passed.
- Installer verification: an isolated private repository and Vercel project were provisioned through the real workflow, with two Neon databases and two Blob stores. Migrations, administrator initialization, Production and code Preview deployments, GitHub connection, bootstrap cleanup, checkpoint resume and the site's completion record succeeded. Browser verification passed on the installed Production site: administrator login, saved Preview, Live publication and unpublication. The smoke test caught a commit-author mismatch; the installer now uses the connected GitHub identity and reports blocked deployments explicitly. Setup screens also passed desktop/mobile and light/dark accessibility checks.
- Hosted app verification: revision 9508307 passed both GitHub CI runs and the hosted admin, font/logo and publishing/lock browser scenarios. Preview database migration passed after a private data snapshot. Temporary editors were removed and existing approval states restored. The demo is left unpublished with a saved content Preview at https://designos-preview-rockinghorse.vercel.app/preview; its admin remains at /admin. Deployment dpl_D8QpdTVdkHPAyiEjYC2ceuE8UsAt contains the verified app changes.
- Public source: RockingHorsePictures/website-designOS is public and a GitHub template. Its default branch was foundation/design-os until 0.4.0, when development moved to `main`. The existing Vercel project's production branch remains main, so publishing the template does not deploy the app into its unconfigured Production environment. All publishable Git history passed a secret scan before changing visibility.
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
- Vercel's initial-deployment constraint was resolved using the user's explicitly approved, credential-free static bootstrap. Its public alias was removed and verified 404; its hashed URL remains protected. Subsequent branch builds correctly target Preview. Main and existing company production systems remain unchanged. See docs/history/HOSTED_SETUP_REVIEW.md for the audit trail.
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
- Remaining moderate dependency advisories are in transitive migration tooling; see docs/OPERATIONS.md.

## How a future design agent begins

The subsequent requested foundation extension adds a Font files upload library (WOFF2/WOFF, static or variable faces), custom body/heading font selection and standard weights 100–900, main/inverse logos and a browser icon in Site Settings, and an admin dashboard AI handoff. START_HERE.md and docs/NEW_SITE.md explain where to work and how to export a clean starter for another company. The contract is now linked from AGENTS.md so a new task can discover it without this conversation. No website visual design has begun.

All six local browser flows pass, including font upload and persisted bytes, rejection of a disguised non-font, the Theme sample, public page, composer, main logo and icon. Thirteen unit checks, typecheck, lint, integration checks and the production build pass. The same upload/logo/handoff flow passes on the hosted Preview; original settings are restored and test uploads removed afterward. Both GitHub CI runs for application revision e46d626 passed. The AI handoff panel and download work without browser errors. Both additive migrations preserve existing values and are applied to local and Preview databases.

The clean starter contains 104 files with no source-site credentials, uploaded assets, repository connection or hosting links. It independently passed dependency installation, all four migrations, demo seeding into a separate local database, and a production build. It begins with one fresh demo administrator and no font/logo records. These checks establish repeatability of the foundation; each future site's hosting and credentials still need their own setup and verification.

The requested typography extension adds a live Theme sample, independently selectable heading/body fonts and heading/body/emphasis weights, with real self-hosted font files. Twelve unit checks, the production build, lint and all five local browser flows pass. The additive migration preserves existing theme values and versions with the original system-font defaults. See docs/DESIGN_HANDOFF.md for the next design task's baseline, inputs and starting prompt.

Obtain explicit instruction to begin the visual design phase, then read this status, V5, docs/ARCHITECTURE.md and AI_SITE_CONTRACT.md. Run the existing tests and inspect the real editor before modifying templates. Obtain approved company references and visual direction. Extend shared sections and schemas together; preserve draft isolation, structured records and existing content migrations. Keep demo content clearly identified until approved content replaces it.

## 0.2.1 release verification

Published v0.2.1 at c4718a2219b5c760bf4f6af45977e1b18e7e065d. The public installer asset was launched successfully using npm 12 with the documented allow-remote flag. Full CI passed on the final code commit 0345801 (the tag adds handoff documentation only). Hosted demo admin, context export, branding and publication browser checks passed; temporary editor removed. Git history credential scan found no leaks.

RHP maintenance PR: https://github.com/RockingHorsePictures/rhp-website/pull/1. Its existing design folder now contains the update and working private code-preview AI connection; pre-existing discovery changes are intact. Its GitHub/Vercel link was repaired and verified via the project API. Production rollout/account provisioning is pending the explicit approval requested in this conversation; no RHP Production migration, account creation or deployment has been performed. Private database snapshots were saved before repair.

## 0.7.4 — Repair restores files held by a release

On rhp-website the 0.7.2/0.7.3 repair was refused for 224 images with "This file is retained by a site release", because a Preview had been saved after the first import. Release retention correctly blocks replacing a released file, but here the file was missing and the repair puts back the same file.

- **Permission:** a repair now restores the file under the record's own filename (`overwriteExistingFiles`, with the original name), so every size keeps its name. A restore context (`designosRestoreFile`) lets this one write past the retention check, and only after the import confirms the stored file is missing. Any other replacement of a released file is still refused (`test:releases`).
- **Checks:** a repair that would land under a different name is reported, and a file already present is left alone.
- **Verified:** locally with a retaining Preview release, and through real Blob storage, where the original and both sizes came back under the same names with "Update records this site already has" unticked.

## 0.7.3 — Deployable again

0.7.2 built but failed at "Deploying outputs" on Vercel with `ENOENT … .next/lock`. Its new storage check called `path.resolve(process.cwd(), …)` in code the import route loads.

- **Cause:** Next's output file tracing treats `process.cwd()` as "the whole project", so the route's function bundle listed 13,229 files (docs, media and `.next` itself). Vercel then tried to copy the `.next/lock` file, which had already been removed.
- **Fix:** route code no longer uses `process.cwd()`. Local paths are relative, and the shared AI request logic receives upload bytes from its callers. The image-description route was fixed the same way.
- **Result:** bundles are about 413 files.
- **Regression test:** a unit test fails if any file under `src/` (except the export CLI module) calls `process.cwd()`.

## 0.7.2 — Content import uploads every file

A real import into rhp-website (Vercel Blob over OIDC) created all 229 media records, but only the first few files reached storage, and the import reported success.

- **Cause:** the import passed one shared `context` object to every Payload save. `@payloadcms/plugin-cloud-storage` keeps the upload's file on `req.context._payloadCloudStorage` and only sets it once, so later uploads were skipped without an error. Reproduced through real Blob storage: a normal upload stored 3 of 3 files, the import stored 1 of 3.
- **Fix:** each save now gets its own context; after the fix the import stores 3 of 3.
- **Check:** each file step confirms the file is in storage (`storedFileExists`: Blob by token or OIDC, or local) and reports a problem if it isn't.
- **Repair:** the plan finds matched file records whose stored file is missing (`missingFiles`), and the import re-uploads them onto the existing record. Verified through real Blob storage: the original file and its sizes were restored with no duplicate record.
- **Keep existing:** a new option, **Update records this site already has** (untick it), adds only new records and repairs files, leaving existing records, and edits made on the site, unchanged.
- **Ordering:** the ordering step prepares keys in one request and saves them five records per request. It previously re-saved every record in one request, which hit Vercel's 60-second limit with 47 case studies.

## 0.7.1 — Updates keep sites' own migrations

Delivering 0.7.0 to rhp-website, which has six bespoke migrations, exposed two update problems:

- **The migration list:** both sides appended to `src/migrations/index.ts`, so it conflicted.
- **The schema snapshot:** the release's new snapshot (`20261001_162112_ai_live_editing.json`) knew only Design OS's 116 tables, not the site's 157. As the newest snapshot, it would make the site's next `migrate:create` try to recreate its own tables. Shown on the real site code: drizzle immediately asked about renaming the site's `case_studies_locales.brief`.

`scripts/upgrade.mjs` now handles both:

- **`migrationIndex`:** rebuilds `index.ts` from the migration files present, in order.
- **`mergeSnapshot`:** applies a release's snapshot change (base → next) to the site's latest snapshot whenever the site has migrations of its own.

Verified on the rhp-website update: 23 migrations ran on a fresh database, and a following `migrate:create` reported "No schema changes detected". Sites get this from the update after they install 0.7.1. rhp-website received this updater in its 0.7.0 update pull request.

## 0.7.0 — Live AI editing

Requested 2026-10-01. Routing an AI's content changes through bundle uploads was impractical for frequent iteration, so the AI now works in the live workspace as drafts, behind the owner's Save to Preview / Publish to Live gate.

- **Connection (`src/lib/ai-live/connect.ts`):** `npm run ai:connect -- live <site>` starts a device-style request.
  - The owner approves it at `/connect-ai?code=…`, signed in as an administrator.
  - The tool then collects a key once. The key is held AES-GCM sealed in `designos_ai_connect` until collected, and requests expire after 15 minutes.
  - The key belongs to the single "AI — live site" account (`role: ai`, `aiConnection: live`) through Payload's `useAPIKey`. API keys are refused for non-AI users.
  - Approving again replaces the key; Disconnect revokes it. No database credentials leave the site.
- **Write switch:** `readOnlyAI` now also treats an AI account as read-only once its `aiWriteUntil` has passed. Overview → AI editing allows edits for 1 or 7 days (`/api/ai/admin`, administrators). The account starts read-only. Code previews stay read-only regardless.
- **Requests (`src/lib/ai-live/request.ts`, shared with the local bridge):** live updates require `expectedUpdatedAt` from a prior read and are refused with 409 if the record or global was saved since.
  - Every live write is logged in `designos_ai_changes` with the changed fields' before and after values.
  - Uploads go through multipart, up to 4 MB on Vercel.
- **Review (`src/lib/ai-live/changes.ts`):** Overview lists the AI's changes since the last Preview.
  - Undo restores only the fields whose current value is still the AI's, so later human edits are kept. Undoing an addition deletes the record as the person.
- **Bridge:**
  - `scripts/ai-live.mjs` implements the `live` environment for `ai:check`, `ai:context`, `ai:health` and `ai:request`, and for the MCP tools (`cms_write` gains `expectedUpdatedAt`).
  - Database profiles remain for installer sites.
  - `/connect-ai` is reserved in routing.
- **Verified:**
  - `test:ai-live` (database): one-time key, decline, read-only by default, time-limited writes, stale-write refusal, locks, change log, undo keeping later human edits, undo of additions, no publishing, read-only code previews, expiry and disconnect.
  - Browser test: the real `ai:connect` command, approval page, Overview switch, a CLI update, Undo in the panel, turning off, disconnecting.
  - Existing `test:ai` passes on the shared request logic.

## 0.6.1 — Updates merge customised files

Every release changes `package.json` (at least its version), and sites add their own packages, so every update pull request flagged `package.json` and `package-lock.json` as conflicts. Releasing 0.6.0 to rhp-website showed it: those two plus `EDITOR_GUIDE.md` needed manual merging.

The updater (`scripts/upgrade.mjs`) now resolves these against the baseline release's file:

- **`package.json`:** merged entry by entry (`mergePackageJson`). Upstream changes apply, site additions stay, and only an entry both sides changed differently is a conflict.
- **`package-lock.json`:** regenerated with `npm install --package-lock-only`.
- **Other text files:** three-way merged (`git merge-file`) when the edits don't overlap.

Workflow files a site doesn't have are ignored in every mode, not only PR mode. On a clone of rhp-website's `main`, a 0.5.1 → 0.6.0 update went from 3 conflicts to 0, with every site package locked. Sites get this behaviour from the update after they install 0.6.1.

The transfer test's record creation is loosely typed, so it compiles on sites whose collections add required fields. This failed rhp-website's 0.6.0 preview build.

## 0.6.0 — Content transfer

Requested 2026-10-01. Content built while designing (in the local database) had no supported route to the live site, and the AI's production connection is read-only by design.

- **Export:** `npm run content:export` writes a zip bundle (`src/lib/content-transfer/`).
  - It contains every collection except users, AI usage, enquiries, releases and the publication pointer; every enabled language; the navigation, site settings, theme and search strategy; and the original upload files.
  - Demo records are skipped unless `--include-demo` is passed.
  - Approvals and secrets (webhook secrets, page passwords, Google IDs) never leave the source.
  - The manifest carries a source identity: a hash of the database host and name, never credentials.
- **Import:** **Overview → Import content** (administrators; refused on code previews) runs in the browser step by step through `/api/content-import`, so no request nears Vercel's limits.
  - **Plan:** shows new versus updated records. Matching uses earlier imports from the same source (`designos_import_map`) first, then the web address, the unique title, or an image's filename plus dimensions (images are re-processed on upload, so sizes differ).
  - **Order of writes:** files first, then records in dependency order, then cyclic references linked in a second pass, then translations (skipped where a record has no translated title), settings, the custom order and optional demo removal.
  - **Link rewriting:** uses the destination's own field schema, so bespoke collections work. It covers relationship and upload fields (including polymorphic ones), groups, arrays, blocks, tabs, Lexical uploads and internal links, section `mediaRef`s, and section props named `<collection>Id(s)`.
  - **Unmatched links:** an unresolved reference is removed and reported, never left pointing at an unrelated record. Numeric props whose names match no collection are reported for checking by hand.
  - **Approvals:** imported values are not stamped as approved (`designosImport` context).
- **Verified:**
  - Unit tests: 59, including remapping and the zip round trip.
  - `test:transfer` (database): linked records with upload, relationship, group, rich-text, section and cyclic references; translations; order; no pre-approval; reruns without duplicates, including same-named records; selective demo removal; the publication pointer refused.
  - Browser test: imports through the dialog.
- **Real-data rehearsal:** the rhp-website design branch's local database (392 records, 229 images, 20 MB) was exported and imported into a fresh scratch database built from that site's code.
  - Result: 0 errors, 0 unresolved links, all 392 records identical field by field with every link mapped to the right record, and the order kept.
  - A second import created nothing and reused all 229 images.
  - A Save to Preview release then captured the site. This needed a placeholder summary for one draft case study whose summary is empty at the source.

## 0.5.1 — Code preview banner on the sign-in page

Payload's admin `header` slot only renders after sign-in, so the code preview banner was missing from the sign-in page, which is the first screen on a code preview. It is now also in `beforeLogin` (checked at desktop and phone widths).

Releasing 0.5.0 also confirmed on the rhp-website update pull request that the Neon preview branch received both ordering migrations and that the code preview banner links to the live admin. That site's 0.4.1 updater wrongly listed `.github/workflows/ci.yml` (absent from Deploy Button repositories) as a conflict. 0.5.0's updater ignores workflow files a site doesn't have.

## 0.5.0 — Orderable collections, read-only code previews

**One place to work (requested 2026-10-01).** Owners edit, preview and publish only at the live address (`/admin` → Save to Preview → Publish to Live). Code changes go live by merging their pull request.

- **Read-only code previews:** Vercel Preview builds of a site run on a throwaway Neon branch, so they are now read-only (`src/lib/code-preview.ts`).
  - **Writes:** protected collection and global writes throw, even with access overridden, and access returns false so the admin renders read-only.
  - **Also blocked:** publishing, account creation and deletion, and `/setup`.
  - **Dashboard:** hides New page, quick actions and publishing.
- **Banner:** a fixed-colour **Code preview** banner on the site, admin, composer and setup links to the live `/admin` (`VERCEL_PROJECT_PRODUCTION_URL`). The environment badge reads "Code preview · read-only".
- **Opt-out:** the product repository's demo deliberately lives in Vercel's Preview environment. It sets `DESIGNOS_PREVIEW_EDITING=allow` (added to the company-design-os Preview environment) to stay editable.
- **Unaffected:** the local AI bridge runs outside Vercel. It already refuses a "preview" database that equals production, which is the case on Deploy Button sites.
- **Verified:** the release regression test confirms that page, global and overridden-access writes and publishing are refused, and that the opt-out allows writes. A local server in code-preview mode showed the banner on the site, admin, edit screen and setup, a read-only edit screen, and a 403 with instructions for API saves.

### Orderable collections

Requested 2026-10-01: a way to order CMS collections, with date and title options and a custom order entered by hand or by drag and drop.

- **Custom order:** pages, services, case studies, team, blog posts, categories and clients use Payload's `orderable` (a fractional `_order` key). Their admin lists open in that order with drag handles; drags go through Payload's `/reorder` endpoint, which checks edit access and respects drafts.
- **Position:** a virtual sidebar field on each record (`src/cms/fields/ordering.ts`) shows the record's place and moves it when a new number is typed. AI writes can set `position` too. `_order` and `position` are not lockable, so records with locked fields can still be moved.
- **Listing order:** a Site Settings group chooses custom, newest, oldest, A–Z or Z–A for each listed collection. The defaults (posts newest, clients A–Z, others custom) keep current behaviour. List sections (`SelectedProjects`, `Services`, `Team`, `Logos`, `Posts`) take an optional `order` that overrides it. Hand-picked records keep their chosen order, and `latest` means newest. All site listings (index pages, team, blog, categories, sections) use `src/lib/ordering.ts`.
- **Migrations:**
  - `20260930_230214_custom_order` adds the keys and settings, and converts each collection's existing numeric order (then ID; clients by name) into keys, including draft versions.
  - `20260930_230410_remove_numeric_order` then drops the old `order` columns.
  - Verified locally: every collection kept its order exactly.
- **Older releases:** releases captured before 0.5 carry the old numeric `order`, which the custom sort falls back to. Custom keys are compared by character code, never by locale.
- **Verified:** typecheck, lint, 55 unit tests, the new `test:ordering`, releases, integration and AI regression tests, the production build, and 16 browser tests. The new browser test drags a row in the admin list, types a Position and checks Site Settings.

## 0.4.2 — Preview database safety check

Code previews trust `DESIGNOS_PREVIEW_DATA=branch`, but that setting can be added while Neon preview branching is off. The first Deploy Button site had exactly that. In that state a preview would migrate and edit the live database.

Production builds now record a fingerprint of their database server in `designos_database_identity`. A Neon branch copies that row but runs on a different server, so a preview build that still matches the live fingerprint stops before migrating, with instructions (`scripts/database-identity.mjs`). Verified against local Postgres: with no record, the preview is allowed; on the same server it is blocked; on a different server it is allowed.

## 0.4.1 — Blob stores connected by the Deploy Button

The first real Deploy Button run failed with "Hosted media requires persistent Blob storage." Vercel now connects new Blob stores with `BLOB_STORE_ID` and the deployment's OIDC identity, and no longer adds `BLOB_READ_WRITE_TOKEN`. Payload's adapter (including 3.90) only accepts tokens.

`src/cms/storage/vercel-blob-oidc.ts` is a small adapter covering the same public-file behaviour using OIDC credentials, on `@vercel/blob` 2.8. Token-based stores (the demo, installer sites) keep Payload's adapter unchanged. Locally pulled OIDC tokens are development-scoped, so they are rejected by Blob stores connected to Preview and Production only. Verification is therefore on a real deployment.

## 0.4.0 release record — 2026-09-30

Published v0.4.0 with the installer asset. Development moved to `main` (now the default branch). The `stable` branch points at the v0.4.0 tag and is what the README's Deploy Button clones. PRs #1, #2 and #3 were merged by fast-forward, with CI green on the final commit.

The product repository's Vercel project has no Production environment, so its "Ignored Build Step" skips Production builds from `main`. Branch pushes still build Previews.

The demo database (Vercel Preview environment) was updated:

- A private snapshot was taken first.
- The three pending migrations were applied.
- All 90 moved text values match the snapshot.
- The idempotent seed added the new demo post, form, block and layout page.

`designos-preview-rockinghorse.vercel.app` now serves v0.4.0. With no Live release, the public site is still "Coming soon". The saved Preview release, the blog and the new sign-in page render. The new demo content appears in Preview after the next Preview release from the admin.
