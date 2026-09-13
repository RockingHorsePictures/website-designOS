# Reuse Design OS for a separate website

## Guided installer

With Node.js 22+ and Git installed, run the single command in README.md. It opens a local browser wizard. Sign in to Vercel using its browser flow. The wizard reuses a GitHub Git credential when available, or accepts a temporary GitHub token with repo/workflow permission; organisation access may need approval from that organisation. Credentials never go to a Design OS service.

Choose a new site name, GitHub owner, Vercel team, local folder, data region and administrator credentials. Review the resources before starting. The installer creates a private website repository, Vercel project, separate Production and code-testing Neon databases/Blob stores, independent signing secrets, and an initial administrator and page. It migrates before deployment and verifies the editor's assigned address. The live URL shows Coming soon until you publish from /admin; /preview is the saved content Preview inside this same CMS deployment. Feature-branch Vercel deployments remain a separate code-testing environment.

The wizard may pause for Neon terms or Vercel GitHub-app repository access. Complete the account step, then resume using the same folder and site details. Completed steps are recorded in ignored .designos/setup.json. It rejects arbitrary existing folders and existing provider resource names rather than adopting another site's resources. If a provider operation succeeds but its reply is lost before a checkpoint is saved, inspect the named resource in that provider before retrying; the installer stops on collisions instead of deleting or replacing it. Existing complete websites are maintained using the upgrade workflow below, not reinstalled.

Local environment files contain this site's service credentials and are ignored by Git and deployment uploads. Store the administrator password in your password manager. The installer does not configure a custom domain, transactional email, paid backup policy or a whole-site scheduler; these remain explicit launch choices. Public uploads are intended for website assets.

Setup commits use the connected GitHub account's private commit identity, independently of the CMS administrator email. That GitHub account must have deployment access to the chosen Vercel team. A blocked or failed deployment stops with a recovery message; it does not wait indefinitely or silently change accounts.

## Reviewed updates

Every exported site records its originating version, commit and baseline file hashes in designos-installation.json. Plan an upgrade with `npm run upgrade -- vX.Y.Z`. Review .designos/upgrade-review.json, then add `--apply` to prepare a separate upgrade branch. Neither command changes the database or deploys anything.

Upstream changes are compared with the original baseline and your current files. Custom changes are preserved where upstream did not change the same file. If both changed a file, the upgrade stops before writing website files. Resolve those changes through an AI/developer review; there is no automatic overwrite or unattended upgrade. Commit the reviewed branch, install dependencies, run checks on a disposable database, review its code Preview, back up Production, and apply compatible migrations before releasing. Code rollback alone cannot undo an incompatible database migration.

Use one project, repository, CMS database and media store per company. A new conversation for the same site does not need any duplication.

## Export a clean starter

From a reviewed foundation checkout, with changes committed:

```sh
npm run starter:export -- .local/new-site-starter
```

The destination must not exist. The exporter copies committed application files, docs, schema migrations and tests from HEAD. It excludes Git history, deployment links, environment files, databases, uploads and local credentials. It resets site-specific workspace details and verification history. It does not create a repository, deploy, or connect any services.

Move the resulting folder to your new project's location and open it in Codex. Initialise a fresh Git repository. Update `site-workspace.json` with the new repository URL and the branch containing its foundation. Read README.md to install dependencies, configure fresh local secrets, create a local database, migrate and seed neutral demo content. The included local runner uses port 54329: stop the other site's local runner before starting this copy, or configure a separate local PostgreSQL server and DATABASE_URL. Never point the new site at another site's database.

Create a new private GitHub repository and Vercel project when ready for a hosted preview. Provision its own database and Blob store and distinct Payload/cron secrets. Follow README.md and OPERATIONS.md for setup and launch requirements. Existing Vercel/GitHub account sign-in can be reused; another site's service credentials, CMS records and uploaded assets must not be reused automatically.

## First instruction in the new project

> Read START_HERE.md and AI_SITE_CONTRACT.md. Set up this fresh Design OS starter for my new company website with separate resources. Gather my company brief, approved assets and visual references, then begin the design workflow in DESIGN_HANDOFF.md. Preserve editable content and publishing. Build and verify in Preview; production release needs a separate decision.

The starter is independent rather than centrally hosted. Keep each site's code under version control and use the reviewed update workflow above for later foundation releases. Create future starters from this reusable product, before company-specific design/content changes.
