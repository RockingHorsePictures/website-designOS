# Operations and recovery

## Environment isolation

Application releases include both the public website and Payload admin. Test code changes on a feature-branch Preview, review the checks, apply any compatible schema migrations to Production using its own credentials, then release the reviewed code using Production configuration. Do not merely assign the production domain to a Preview instance connected to preview data.

The code release does not transfer CMS records or Blob objects. After launch, routine content work belongs in the Production CMS with draft/preview/publish for versioned documents. Global settings currently save immediately. For initial launch, transfer only reviewed content and assets into the new Production resources, remap relationship IDs where needed, verify metadata and uploads, and provision production users separately. This is an operational plan, not an implemented automatic content-transfer feature. Never overwrite a populated Production database with a Preview snapshot as part of a routine release.

Separate preview and production PostgreSQL databases, database users, Blob stores, Payload secrets, cron secrets and optional AI provider credentials. Never copy production connection strings into local/preview settings. The app rejects known environment-label mismatches; operators must also verify the actual resource identities.

Use deployment protection for hosted previews. Never disable it to simplify testing. Preview noindex/crawler blocking is defense in depth, not authentication. Uploaded media is intended for public website delivery: do not upload confidential material to this public media library.

## Recovery plan

Before a production launch, enable managed PostgreSQL point-in-time recovery with the chosen provider and confirm the retention period meets company requirements. Recommended baseline: 7-day PITR plus daily encrypted logical backups retained for 30 days, stored separately from the live account. This policy is a launch prerequisite, not a claim that external backups have already been configured.

Back up media objects and their metadata to a separate versioned bucket/store on a daily schedule; retain deleted/replaced assets for at least 30 days. A database restore alone does not restore deleted Blob objects. Restrict destructive storage permissions to administrators.

To recover: restore database and media into a new isolated environment, apply any forward migrations required by the selected code revision, run admin/public/media smoke tests, then change environment bindings under a maintenance window. Keep the original resources intact until validation completes.

Payload versions recover previous content edits. Restore and review a version, then publish. Deleted-record recovery requires backups. Code rollback uses the prior known-good Vercel deployment. Do not roll code back across an incompatible schema change: prefer a forward fix, or restore a matching database snapshot and media backup into new resources. Generated DOWN migrations can drop data; run them only on disposable test databases unless an explicitly reviewed recovery plan calls for them.

## Scheduled publishing

An authenticated scheduler calls `/api/payload-jobs/run?allQueues=true` with the deployment's CRON_SECRET. Jobs are stored in PostgreSQL and survive process restarts. Review failed jobs in Payload/admin or logs. Local development runs a minute worker. The current Hobby preview has no automatic scheduler; its endpoint is tested by explicit invocation. Configure a production scheduler before relying on timed changes (see README), and verify publication occurs at the scheduled time.

## Search onboarding / legacy URL inventory

Before later content migration, create a CSV inventory with: `old_url,title,content_type,new_slug,action,source_note,approved`. Inventory the supplied site's sitemap and linked public URLs; review important URLs using first-party traffic/search data when available. This foundation intentionally does not contain an unrestricted remote crawler/importer.

For each URL, preserve its path or create a reviewed internal Redirects record. Import content into the matching structured collection, attach evidence/source notes and keep it as draft. Verify titles, summaries, canonical destinations, media/alt text, relationships and redirects. Test a sample of preserved, redirected and removed URLs for 200/308/404, then inspect sitemap/robots. Inferred facts stay unverified until a company user confirms them.

## Credentials and accounts

Secrets remain in ignored local environment files and encrypted hosting variables. Do not paste them into issue trackers or docs. Remove temporary bootstrap credentials after first hosted login. Rotate secrets if exposed. No third-party email adapter is configured; production password reset email delivery must be connected before launch or handled by an administrator.

## Dependency audit

The initial critical/high findings in Vitest and sharp were updated. The remaining audit chain is Payload's migration tooling → drizzle-kit → deprecated esbuild-kit → esbuild 0.18 (moderate development-server advisory). The app does not run the esbuild-kit development server. Keep migration tooling confined to trusted environments and update when Payload/Drizzle replace the dependency; no unsupported forced override is applied. ESLint 9 is retained for Next plugin peer compatibility.

## Release verification record

Record actual database and storage identifiers, deployment URLs, migration run, admin login, upload/redeploy persistence, draft/public separation, scheduled job execution, rollback exercise and the person approving promotion. Do not mark Phase 3 hosted acceptance complete based on configuration files alone.
