# Connect AI to this website

Your AI coding tool (Claude Code, or another agent using the same commands) connects to the **live website** over its normal address. The owner approves the connection in the admin. No passwords or database credentials are copied anywhere.

What the connection can do:

- **Always:** read the workspace: pages, records, settings and their approvals and locks.
- **Only while the owner allows AI edits** (Overview → **AI editing** → _Allow edits for 1 day / 7 days_): save drafts in the workspace and upload images. Every change is listed under **Changes by AI**, with Undo.
- **Never:** save a Preview, publish, approve, unlock, change locked fields, delete, verify facts or manage people. Nothing an AI writes is visible to anyone until a person chooses **Save to Preview**, and nothing goes live until they **Publish to Live**.

## Connect (once per computer)

In the website's folder:

```sh
npm run ai:connect -- live https://your-site.com
```

It prints a link and a short code. The owner opens the link signed in as an administrator, checks the code matches, and chooses **Connect**. The command then finishes by itself. The key is saved in `.designos/ai-live.json`, which Git ignores. Never print, commit or paste it.

Connecting again (for example from another computer) replaces the previous key, so only the most recently approved tool stays connected. Overview → AI editing → **Disconnect** revokes it at once.

```sh
npm run ai:check      # what the connection can do right now
npm run ai:context    # refresh .designos/ai-context.json (content, approvals, locks)
```

## Read and change content

Create a request file such as `.designos/request.json`:

```json
{ "action": "read", "collection": "services", "where": { "slug": { "equals": "film" } } }
```

```sh
npm run ai:request -- live .designos/request.json
```

To change a record, **read it first** and send its `updatedAt` as `expectedUpdatedAt`, with only the fields you are changing:

```json
{
  "action": "update",
  "collection": "services",
  "id": 12,
  "expectedUpdatedAt": "2026-10-01T15:04:05.123Z",
  "data": { "summary": "New summary" }
}
```

If someone saved the record after you read it, the write is refused. Read it again and reapply only your change, so a person's edit is never overwritten. Globals (`"global": "site-settings"`) work the same way.

- **New records:** `"action": "create"` with `data`.
- **Images:** `{ "action": "upload", "collection": "media", "file": "brand/team.jpg", "data": { "alt": "Our team outside the studio" } }`. The file must be inside the website folder and under 4 MB.
- **Translations:** add `"locale": "fr"`.
- **Reads:** support `where` and `page` (100 records per page).

When AI edits are switched off, writes are refused with a message. Send the owner the change to make, or ask them to allow edits.

## MCP tools

In Claude Code the same connection is available as MCP tools (`designos_check`, `designos_context`, `cms_read`, `cms_write`, `cms_upload_image`, `site_health`, `list_sections`, `validate_composition`, `audit_site`); see docs/AI_TOOLKIT.md. Use `environment: "live"`.

## Local development and other profiles

- **Local:** a `.env` labelled `SITE_ENV=local` and `DATABASE_ENV=local` appears as the `local` environment (run `npm run ai:connect` once). Use it to try out new section designs before their code is merged. The live site can only use sections whose code is live.
- **Installer sites:** sites made with the guided installer may also have `production` (read-only) and `preview` database profiles from `.env.production.local` and `.env.preview.local`. These still work, but the `live` connection is preferred: it needs no database credentials on your computer. Once `live` works, the production profile's environment file can be deleted.
- **Code previews** are read-only throwaway copies; never write there.

## Browser chat, another computer or cloud coding

From the admin dashboard, expand **Build your website with AI** and download the instructions and **website context** to attach to a chat. The context contains no credentials, but includes unpublished content, so share it deliberately. It is a dated snapshot, not a live connection, and grants no write access.

On another computer, clone the repository, run `npm ci`, then `npm run ai:connect -- live https://your-site.com` and have the owner approve it. A cloud coding environment can do the same if it can reach the site. Never copy another site's keys or database credentials.

## If a check fails

- **No CMS connection found:** run `npm run ai:connect -- live https://your-site.com`.
- **"This AI connection is not valid any more":** it was disconnected or replaced. Connect again and ask the owner to approve.
- **"AI edits are switched off":** the owner allows them from Overview → AI editing, or you send the change for them to make.
- **"This changed since you read it":** read the record again and reapply only your change.
- **Locked field:** ask the owner to unlock it under Approvals & locks, and to relock it after review. Never work around a lock.
- **Image too large:** resize below 4 MB and upload again.
