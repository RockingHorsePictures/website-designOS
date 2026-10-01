# Operations and recovery

## Environment isolation

Application releases include both the public website and Payload admin. Test code changes on a feature-branch Preview, review the checks, merge it; the production deployment migrates the Production database during its build (unless `DESIGNOS_AUTO_MIGRATE=false`) and then serves the reviewed code. Do not merely assign the production domain to a Preview instance connected to preview data.

The code release does not transfer CMS records or Blob objects. After launch, routine content work belongs in the Production CMS with draft/preview/publish for versioned documents. All forms save to the workspace. The Production CMS creates a frozen whole-site Preview, then explicitly publishes that reviewed release to Live. Globals no longer change Live immediately. For initial launch, move content with the built-in transfer: `npm run content:export` in the database it was built in, then **Overview → Import content** on the live site, as an administrator. It recreates records and files with every reference remapped to the new IDs, lands everything in the workspace (nothing is published or pre-approved), and is safe to repeat. It never transfers accounts, enquiries, releases or the Preview/Live pointer. Provision production users separately. Vercel limits each uploaded file in an import to 4 MB. Never overwrite a populated Production database with a Preview snapshot as part of a routine release.

Separate preview and production PostgreSQL databases, database users, Blob stores, Payload secrets, cron secrets and optional AI provider credentials. Never copy production connection strings into local/preview settings. The app rejects known environment-label mismatches; operators must also verify the actual resource identities.

Use deployment protection for hosted previews. Never disable it to simplify testing. Preview noindex/crawler blocking is defense in depth, not authentication. Uploaded media is intended for public website delivery: do not upload confidential material to this public media library.

## Recovery plan

Before a production launch, enable managed PostgreSQL point-in-time recovery with the chosen provider and confirm the retention period meets company requirements. Recommended baseline: 7-day PITR plus daily encrypted logical backups retained for 30 days, stored separately from the live account. This policy is a launch prerequisite, not a claim that external backups have already been configured.

Back up media objects and their metadata to a separate versioned bucket/store on a daily schedule; retain deleted/replaced assets for at least 30 days. A database restore alone does not restore deleted Blob objects. Restrict destructive storage permissions to administrators.

To recover: restore database and media into a new isolated environment, apply any forward migrations required by the selected code revision, run admin/public/media smoke tests, then change environment bindings under a maintenance window. Keep the original resources intact until validation completes.

Payload versions recover previous content edits. Restore and review a version, then publish. Deleted-record recovery requires backups. Code rollback uses the prior known-good Vercel deployment. Do not roll code back across an incompatible schema change: prefer a forward fix, or restore a matching database snapshot and media backup into new resources. Generated DOWN migrations can drop data; run them only on disposable test databases unless an explicitly reviewed recovery plan calls for them.

## Scheduled publishing

Whole-site publication is now explicit from Overview. Legacy scheduled document operations only update workspace state and do not release a site. Do not promise timed whole-site launches using the document job runner.

An authenticated scheduler calls `/api/payload-jobs/run?allQueues=true` with the deployment's CRON_SECRET. Jobs are stored in PostgreSQL and survive process restarts. Review failed jobs in Payload/admin or logs. Local development runs a minute worker. The current Hobby preview has no automatic scheduler; its endpoint is tested by explicit invocation. Configure a production scheduler before relying on timed changes (see Manual deployment, step 7, below), and verify publication occurs at the scheduled time.

## Search onboarding / legacy URL inventory

Before later content migration, create a CSV inventory with: `old_url,title,content_type,new_slug,action,source_note,approved`. Inventory the supplied site's sitemap and linked public URLs; review important URLs using first-party traffic/search data when available. This foundation intentionally does not contain an unrestricted remote crawler/importer.

For each URL, preserve its path or create a reviewed internal Redirects record. Import content into the matching structured collection, attach evidence/source notes and keep it as draft. Verify titles, summaries, canonical destinations, media/alt text, relationships and redirects. Test a sample of preserved, redirected and removed URLs for 200/308/404, then inspect sitemap/robots. Inferred facts stay unverified until a company user confirms them.

## Email and enquiries

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` and optionally `SMTP_FROM_NAME` per environment to enable password-reset email and enquiry notifications (any SMTP provider, for example your email host, Resend, Postmark or SES). Notifications go to `FORM_NOTIFY_EMAIL`, or the Site Settings email when that is empty. Without SMTP, enquiries are still stored under **Enquiries** and email content is only logged. Test by submitting a Contact section form after each deployment configuration change.

Enquiries are personal data. Only admin/editor accounts can read them (AI accounts cannot). They are not part of site releases or AI context exports. Define a retention period with the owner and delete old enquiries; include the table in backups and data-subject requests. The form stores a salted hash of the sender's network address for rate limiting only (five messages per ten minutes), never the address itself.

## Credentials and accounts

Secrets remain in ignored local environment files and encrypted hosting variables. Do not paste them into issue trackers or docs. Remove temporary bootstrap credentials after first hosted login. Rotate secrets if exposed. Password reset email requires SMTP (above); otherwise an administrator resets passwords.

## Dependency audit

The initial critical/high findings in Vitest and sharp were updated. The remaining audit chain is Payload's migration tooling → drizzle-kit → deprecated esbuild-kit → esbuild 0.18 (moderate development-server advisory). The app does not run the esbuild-kit development server. Keep migration tooling confined to trusted environments and update when Payload/Drizzle replace the dependency; no unsupported forced override is applied. ESLint 9 is retained for Next plugin peer compatibility.

## Release verification record

Record actual database and storage identifiers, deployment URLs, migration run, admin login, upload/redeploy persistence, draft/public separation, scheduled job execution, rollback exercise and the person approving promotion. Do not mark Phase 3 hosted acceptance complete based on configuration files alone.

## Manual deployment (without the Deploy Button or installer)

Default topology is GitHub → Vercel with separate managed PostgreSQL and Blob stores for Preview and Production. Production deploys from `main`; feature branches deploy to Preview. Never merge a preview branch just to inspect it.

1. Push the repository to a private GitHub repository and import it into Vercel as Next.js (the build command comes from `vercel.json`: `npm run vercel-build`).
2. Provision separate PostgreSQL databases (Neon recommended, with preview branches) and Blob stores for Preview and Production. Never reuse a production connection in preview.
3. Configure `.env.example` keys per environment. Hosted defaults derive `SITE_ENV`/`DATABASE_ENV` from Vercel's environment and signing secrets from the database credentials (`src/lib/env-defaults.mjs`); explicit values always win. Preview requires `DESIGNOS_PREVIEW_DATA=branch` (or explicit `DATABASE_ENV=preview`) so it can never run against production data.
4. Migrations run during each deployment's build against that deployment's own database (`scripts/vercel-build.mjs`). Set `DESIGNOS_AUTO_MIGRATE=false` to run `npm run migrate` from a controlled terminal instead. Keep migrations additive where possible: during a production build the previous deployment keeps serving until the new one is ready. A migration that removes columns (such as 0.4's localization change) can briefly error the old deployment, so release those at a quiet time.
5. Create the first administrator at `/setup` (with `DESIGNOS_SETUP_CODE`), or temporarily with `BOOTSTRAP_EMAIL` and `BOOTSTRAP_PASSWORD` (16+ characters), removed after first start.
6. Test a Preview: sign in, upload an image, save and publish a test page, redeploy, and confirm the upload persists. Preview must send noindex headers.
7. Timed jobs: configure an authenticated scheduler calling `/api/payload-jobs/run?allQueues=true` with `Authorization: Bearer <CRON_SECRET>`. On a suitable Vercel plan, add `"crons": [{ "path": "/api/payload-jobs/run?allQueues=true", "schedule": "* * * * *" }]` to `vercel.json` (Vercel Cron runs only in Production; Hobby allows daily schedules only). Test before relying on timed publication.

Keep `.vercelignore`: the Vercel CLI does not apply every Git exclusion when uploading local source. Vercel's Hobby plan is for non-commercial use; company websites need a Pro team.

## Migrations

Schema push is **off by default** everywhere. After changing schemas: `npm run generate:types`, then `npm run payload -- migrate:create descriptive_name`; inspect and commit the migration and snapshot, and test it against a disposable database. `DB_PUSH=true` is a local-only development shortcut and must never be used with hosted data. When a generated migration drops columns that hold content, add statements that copy the data first (see `src/migrations/20260930_000113_localization.ts`). If migration generation asks "created or renamed?" questions, split the change so each migration only adds or only removes columns.

## Local development on Windows

Sandboxed execution may prevent Node from resolving the current OS account; run the local database and Payload tools in a normal terminal. Keep `npm run db:local` running in its own terminal window: if the process that started PostgreSQL goes away, the server can stop accepting connections; stop it and start it again.
