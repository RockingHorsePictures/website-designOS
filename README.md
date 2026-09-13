# Company Design OS

## Install your own website

Install Node.js 22+ and Git, then run:

```sh
npx --yes --allow-remote=all --package="https://github.com/RockingHorsePictures/website-designOS/releases/download/v0.2.0/design-os-installer-0.2.0.tgz" design-os
```

The command permits downloading the installer URL for this invocation only; it does not change your global npm settings. npm 12 blocks URL packages by default and otherwise reports `EALLOWREMOTE`. Copy the plain command from the code block, without Markdown link formatting.

The guided browser setup connects your GitHub and Vercel accounts, creates a separate private website repository, provisions isolated hosting resources, creates your administrator and deploys a Coming soon website. Each site is independent of this product repository. See NEW_SITE.md for permissions, setup steps, recovery and upgrades. The original product demo remains a separate Preview environment.

Version 0.2 adds **Save to Preview → Publish to Live**, site unpublishing, field approvals/locks and AI contributor permissions. Live reads a frozen release, so further content edits do not overwrite it. Read EDITOR_GUIDE.md for the new publishing model; the original V5 specification is historical context where later user-approved changes differ.

**Want AI to build a website with this? Start with [START_HERE.md](START_HERE.md).** The admin dashboard has a **Build your website with AI** panel with instructions for this site or a fresh project. See [NEW_SITE.md](NEW_SITE.md) for the clean starter export.

Next.js + Payload + PostgreSQL foundation from `COMPANY_WEBSITE_BUILD_SPEC_V5.md`. The original scope covers Phases 1, 2, 2B and 3; version 0.2 adds user-requested whole-site publishing, locks, an installer and reviewed upgrades. All public views are deliberately neutral proof scaffolding. Final website design requires separate authorization.

Verified hosted Preview: https://designos-preview-rockinghorse.vercel.app; editor at `/admin`. Vercel sign-in protects the Preview; the CMS has its own editor login. On the original setup computer, credentials are in the ignored `.local/preview-access.txt`. Review the foundation in https://github.com/RockingHorsePictures/website-designOS/pull/1.

## Local setup

Requirements: Node 22+ (Node 24 tested), npm, PostgreSQL 17/18 or the included native local server.

```sh
npm ci
cp .env.example .env
```

Set a random `PAYLOAD_SECRET` of at least 32 characters and a strong `SEED_PASSWORD`. Do not commit `.env`. Default database credentials are exclusively for the loopback-only local fixture. The local runner uses native PostgreSQL binaries stored in dependencies and persists its data under `.local/postgres`.

```sh
# Terminal 1 (omit if DATABASE_URL points to your own PostgreSQL database)
npm run db:local
# Terminal 2
npm run migrate
npm run seed
npm run dev
```

Open `http://localhost:3000` and `http://localhost:3000/admin`. The seed is idempotent for its named demo records and refuses production. It creates one administrator only when no user exists, plus 3 services, 3 projects, 6 people, a media fixture, globals and a composed homepage. No real company facts are seeded.

On this Windows setup, sandboxed execution may prevent Node from resolving the current OS account. The local server and Payload tooling then need a normal host terminal. No global database service is installed. Keep the local database process running while using the app.

## Checks

```sh
npm run generate:types
npm run generate:importmap
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:releases
npm run test:installer
npm run build
npm start
# separate terminal; uses installed Edge on Windows, Chromium on Linux
npm run test:e2e
```

Integration/browser tests use the local demo database only. CI provisions disposable PostgreSQL, applies migrations, seeds demo content and runs the checks. HTML browser reports are generated under `playwright-report/`.

## Migrations

Schema push is **off by default** everywhere. After changing schemas, generate types and `npm run payload -- migrate:create descriptive_name`; inspect and commit the generated migration/snapshot. Test it against a disposable database, then apply with `npm run migrate` before deploying compatible code. `DB_PUSH=true` is an explicit local-only development shortcut and must never be used with hosted data.

## Deployment

Default topology is GitHub → Vercel with separate managed PostgreSQL and Blob stores for Preview and Production. Vercel integration must use `main` for Production and feature branches for Preview. Never merge a preview branch just to inspect it.

1. Create a private GitHub repository and push this foundation on `foundation/design-os` for review.
2. Import that repository into Vercel as Next.js.
3. Provision separate managed PostgreSQL databases and Blob stores for Preview and Production. Neon is the recommended default. No production connection is reused in preview.
4. Configure `.env.example` keys per environment. Set `SITE_ENV` and `DATABASE_ENV` to `preview` or `production` accordingly. Use distinct Payload/cron secrets and Blob tokens. Set `NEXT_PUBLIC_SERVER_URL` to the correct deployment origin.
5. Run committed migrations from a controlled terminal/CI against the intended database before serving the app. The Vercel build does not automatically migrate a shared database.
6. On a fresh hosted database, temporarily configure `BOOTSTRAP_EMAIL` and `BOOTSTRAP_PASSWORD` (16+ characters) to provision the first administrator. Remove those variables after first initialization. Empty hosted databases fail closed without these credentials.
7. Deploy the feature branch to Preview. Authenticate, upload an image, save/preview/publish a test record, then redeploy and confirm the upload persists. Preview must send noindex headers and keep production untouched.
8. Configure an authenticated scheduler calling `/api/payload-jobs/run?allQueues=true` with `Authorization: Bearer <CRON_SECRET>`. The current Hobby preview has no automatic worker. On a suitable production Vercel plan, add `"crons": [{ "path": "/api/payload-jobs/run?allQueues=true", "schedule": "* * * * *" }]` to vercel.json. Vercel Cron runs only in Production; Hobby allows only daily schedules. Test the actual scheduler before relying on timed publication.
9. Promote/merge only after review and separate production approval. This foundation run does not start the final visual-design phase.

A temporary static deployment cannot validate Payload persistence and is not a substitute for Phase 3. See IMPLEMENTATION_STATUS for actual hosted verification status.

Vercel requires a first Production-labelled deployment for a new project. This project's approved static bootstrap has no public alias or app credentials; the actual application is on Preview. Keep `.vercelignore`: the CLI does not use all Git exclusions when uploading local source. The protected Preview, hosted editing and media persistence after redeploy have been verified.

## Documents

- `ARCHITECTURE.md`: data flow, editor, preview, search, AI and hosting boundaries.
- `EDITOR_GUIDE.md`: editing, preview, publish, media, schedules and versions.
- `AI_SITE_CONTRACT.md`: rules for future site components and agents.
- `OPERATIONS.md`: backup, recovery, credentials and URL/content onboarding.
- `IMPLEMENTATION_STATUS.md`: completed work, evidence, limitations and next actions.

## Package decisions

Core versions are pinned in package.json and package-lock.json. Payload packages all use 3.89.0; Next.js 16.3.5 and Puck 0.23.0 were checked against official compatibility documentation and package peer requirements. React 19.3.0 and sharp 0.35.4 include current fixes. ESLint 9 is retained because the current Next.js lint plugins do not yet accept ESLint 10; revisit when their peers support it. Embedded Postgres is local development tooling only. Remaining transitive audit findings are documented in OPERATIONS.
