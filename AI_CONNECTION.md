# Connect AI to this website

The installer sets up two AI accounts automatically. Production is read-only; code-preview can edit unlocked content. Both are unable to approve, unlock, delete, verify facts or publish. Your administrator login is separate. This is CMS access for a coding workspace, not an AI model subscription or an in-editor chat service.

## On the installation computer

Open this website's folder in your coding workspace. Run:

```sh
npm run ai:check
npm run ai:context
```

Read `.designos/ai-context.json` before design work. It includes fresh Production and code-preview values, defaults and approval states. Production brand choices and locks are authoritative; do not treat code-preview defaults as permission to change them. Refresh before edits. A `truncated` collection requires further paginated reads.

Credentials are held in ignored `.designos/ai-production.json` and `.designos/ai-preview.json`, alongside the site's ignored environment files. Never print, commit or paste these credentials into a conversation. The bridge authenticates its restricted user and uses Payload's normal access rules and lock hooks. It accesses the CMS from the local runtime, so Vercel's browser deployment protection does not require a shared browser session.

For a missing connection in an existing installation, first upgrade Design OS and apply the additive migration to each site's own database. Then run `npm run ai:connect`. It creates only missing connection accounts, verifies existing accounts and never resets an administrator, seeds content or changes a publication. To revoke access, delete the corresponding AI user in the admin. Reconnecting after revocation is an explicit administrator/owner action. Keep private connection files backed up securely; never borrow another site's files.

## MCP tools and local development

In Claude Code the same bridge is available as MCP tools (`designos_check`, `designos_context`, `cms_read`, `cms_write`, `cms_upload_image`, `site_health`, `list_sections`, `validate_composition`, `audit_site`); see AI_TOOLKIT.md. Before hosting exists, the bridge also works against a local development database: a `.env` labelled `SITE_ENV=local` and `DATABASE_ENV=local` appears as the `local` environment (run `npm run ai:connect` once). Every environment must use its own database.

## Read and change content

Create a request file such as `.designos/request.json`:

```json
{ "action": "read", "global": "theme" }
```

```sh
npm run ai:request -- production .designos/request.json
npm run ai:request -- preview .designos/request.json
```

To edit an unlocked preview token within the user's requested scope:

```json
{ "action": "update", "global": "theme", "data": { "accent": "#2563eb" } }
```

To upload an image from inside the website folder: `{ "action": "upload", "collection": "media", "file": "brand/team-photo.jpg", "data": { "alt": "Our team outside the studio" } }`. Run `npm run ai:health -- preview` for whole-site checks.

For collections, use `collection`, optional `id`, and `action` of `read`, `create` or `update`. Writes require `data`; updates require an individual ID. Reads support `where` and `page` (100 records per page). Only collections and globals with approval controls are exposed. Images can be uploaded with the upload action above; use the admin for font files. Do not use infrastructure credentials to bypass this bridge, locks or permissions. Repository/database administrators still retain infrastructure privileges; this bridge does not sandbox arbitrary code.

## Browser chat, another computer or cloud coding

From the Production admin dashboard, expand **Build your website with AI** and download the instructions and **website context**. Attach both to the conversation. The context contains no credentials, but includes unpublished content; share deliberately. It is a dated snapshot, not a live connection, and grants no write access. Ask for a fresh snapshot when current approvals are needed.

An ordinary chat cannot automatically inherit your local files, CMS session, GitHub or Vercel access. To build and save the site, use a coding workspace connected to the correct repository. On another trusted computer, securely restore this site's private environment and AI connection files and install dependencies, then run the checks above. Never copy another site's database or credentials.

A cloud coding environment needs its own explicit secure setup and network access to the required services. Follow that provider's current environment instructions: secrets available only during a setup step do not automatically reach the agent, and merely adding a secret does not make a local connection appear. Provision private runtime files during the trusted setup stage if using this bridge, or use the credential-free context for planning. Do not upload database credentials to an ordinary chat.

## If a check fails

- **Missing environment file:** open the original installed folder, not a clean Git clone. Restore its private setup through your secure credential process on a new machine.
- **AI access is not configured:** run `npm run ai:connect` after upgrading and migrating.
- **CMS connection failed:** check database availability, dependencies and migrations. Keep the database; do not reset it.
- **Scope changed or account revoked:** the owner must review the AI account in Users. Do not silently promote it or use the owner's login.
- **Locked field:** ask the owner to unlock the named field using Approvals & locks and relock after review. Do not bypass it with CSS or direct database writes.
