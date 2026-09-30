# Design OS

**Bespoke websites built with AI, that you can run yourself.**

Design OS gives an AI (Claude Code, or any coding agent) a complete, production-grade CMS to build on: an owner-friendly editor, a visual page composer, a blog, forms, multiple languages, SEO and AI-search foundations, and safe Preview → Live publishing. The AI designs something unique to your company; you edit copy, swap images, add pages and publish without code, and without needing AI again.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRockingHorsePictures%2Fwebsite-designOS%2Ftree%2Fstable&project-name=my-website&repository-name=my-website&env=DESIGNOS_SETUP_CODE&envDescription=Choose+a+private+setup+code+%288%2B+characters%29.+You+will+enter+it+once+to+create+your+administrator+account.&envLink=https%3A%2F%2Fgithub.com%2FRockingHorsePictures%2Fwebsite-designOS%2Fblob%2Fstable%2Fdocs%2FDEPLOY.md&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%2C%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22public%22%7D%5D)

The button creates your own private repository, hosting, database and image storage. Then open `/setup` on your new site. Full steps, Google sign-in, email, domains and updates are in **[docs/DEPLOY.md](docs/DEPLOY.md)**. Updates arrive as pull requests you review and merge.

## What you get

- **Workspace** at `/admin`: dashboard, pages, blog, forms and enquiries, media, brand (colours, fonts, logos), navigation, team, languages, Sign in with Google, approvals and locks.
- **Page composer**: drag, reorder and edit sections with live mobile/tablet/desktop preview. Includes columns, reusable blocks, page templates and entrance animations. Your site's own bespoke sections appear alongside the base set ([docs/SECTIONS.md](docs/SECTIONS.md)).
- **Publishing**: Save to Preview captures the whole site; Publish to Live releases exactly what you reviewed; unpublish any time.
- **Search and AI visibility**: metadata, structured data, sitemap, RSS, `hreflang`, `/llms.txt`, generated share images, and separate controls for search engines, AI answer engines and AI training crawlers. **Site health** checks everything from the dashboard.
- **AI toolkit** for Claude Code, Claude Desktop and Cowork: an MCP server, skills for building, content and audits (SEO, AEO/GEO, schema, accessibility, content, structure), specialist reviewers, and an optional Claude Design stage ([docs/AI_TOOLKIT.md](docs/AI_TOOLKIT.md)).

## Build your website with AI

Open your site's repository in Claude Code and run `/designos-build`. Start with **[START_HERE.md](START_HERE.md)**; the rules every agent follows are in [AI_SITE_CONTRACT.md](AI_SITE_CONTRACT.md). Owners: see [EDITOR_GUIDE.md](EDITOR_GUIDE.md).

## Develop locally

Requirements: Node 22+ (24 tested) and npm. A local PostgreSQL is included; to use your own PostgreSQL 17/18 instead, point `DATABASE_URL` at it and skip `db:local`.

```sh
npm ci
cp .env.example .env        # set PAYLOAD_SECRET (32+ random characters) and SEED_PASSWORD; never commit .env
npm run db:local            # terminal 1: local PostgreSQL on 127.0.0.1:54329 (data in .local/postgres)
npm run migrate && npm run seed && npm run dev   # terminal 2
```

Open http://localhost:3000 and http://localhost:3000/admin. The seed is idempotent and refuses production: it creates one administrator only when no user exists, plus neutral demo services, case studies, people, a blog post, a form, a reusable block and demo pages showing every section. On Windows, sandboxed shells may stop Node resolving the OS account; run the database and Payload tools in a normal terminal.

**Checks:** `npm run generate:types`, `npm run generate:importmap`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:integration`, `npm run test:releases`, `npm run test:ai`, `npm run test:installer`, `npm run build`, then `npm start` and `npm run test:e2e` (Edge on Windows, Chromium on Linux; reports in `playwright-report/`). CI runs the same on a disposable database.

**AI tools:** `npm run ai:check`, `npm run ai:context`, `npm run ai:health -- local`, `npm run sections -- catalog`, `npm run audit -- http://localhost:3000`, `npm run mcp`. See [docs/AI_TOOLKIT.md](docs/AI_TOOLKIT.md).

**Schema changes:** edit the collections, run `npm run generate:types`, then `npm run payload -- migrate:create name` and review the migration (keep it additive where possible; see docs/OPERATIONS.md → Migrations). Migrations run automatically on deploy (`scripts/vercel-build.mjs`).

## Documentation

| For                                | Read                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| Owners and editors                 | [EDITOR_GUIDE.md](EDITOR_GUIDE.md)                                                         |
| Installing, updating, settings     | [docs/DEPLOY.md](docs/DEPLOY.md)                                                           |
| AI agents (start here)             | [START_HERE.md](START_HERE.md), [AI_SITE_CONTRACT.md](AI_SITE_CONTRACT.md)                 |
| AI tools, audits, Claude Design    | [docs/AI_TOOLKIT.md](docs/AI_TOOLKIT.md), [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) |
| Sections and page structure        | [docs/SECTIONS.md](docs/SECTIONS.md)                                                       |
| CMS connection for AI              | [docs/AI_CONNECTION.md](docs/AI_CONNECTION.md)                                             |
| Architecture and operations        | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/OPERATIONS.md](docs/OPERATIONS.md)     |
| Local installer and starter export | [docs/NEW_SITE.md](docs/NEW_SITE.md)                                                       |
| What is verified                   | [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)                                       |

Core versions are pinned: Next.js 16.3.5, Payload 3.89.0, React 19.3.0, Puck 0.23.0. MIT licensed.
