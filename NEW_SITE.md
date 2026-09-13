# Reuse Design OS for a separate website

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

The starter is a snapshot, not a service that automatically updates every site. Keep each site's code under version control. Later foundation improvements can be reviewed and ported with their migrations and tests. Create future starters from the reusable foundation before company-specific design/content changes, rather than copying an already customised client site.
