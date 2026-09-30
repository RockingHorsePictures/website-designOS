# Install, set up and update your website

This takes about ten minutes and needs no software on your computer: just a free GitHub account and a Vercel account.

## 1. Deploy

Click **Deploy with Vercel** in the [README](../README.md). Vercel will:

1. Copy Design OS into a new private repository in your GitHub account.
2. Create a hosting project.
3. Add a **Neon Postgres** database and a **Blob** store for images. Accept both when asked. In the Neon step, keep **Preview** switched on: it gives code previews their own copy of the database, so testing never touches the live site.
4. Ask for **DESIGNOS_SETUP_CODE**. Choose any private phrase of 8 or more characters. You'll type it once in step 2; it stops anyone else claiming the new site first.

The first deployment builds the site and prepares the database automatically. Your live address shows **Coming soon** until you publish.

## 2. Create your administrator

Open `https://<your-site>.vercel.app/setup`, enter the setup code, your company name, your name and email, and choose how you'll sign in. That's it: you land in your workspace at `/admin`. The setup page stops working once an administrator exists.

After setup, open Vercel → your project → **Settings → Environment Variables** and add **DESIGNOS_PREVIEW_DATA** = `branch` for the **Preview** environment only. This confirms code previews use Neon's separate preview branches. Without it, preview builds stop safely instead of touching live data.

## 3. Optional: Sign in with Google

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**.
2. Add the authorised redirect URI `https://<your-domain>/api/auth/google/callback` (add one per domain you use).
3. In Vercel, add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (Production), then redeploy.
4. Optional: `GOOGLE_ALLOWED_DOMAIN=yourcompany.com` restricts sign-in to your Google Workspace.

Only people you invite (**Overview → Invite a teammate**, or **Users**) can sign in; Google never creates accounts by itself. Once everyone uses Google, set `PASSWORD_SIGN_IN=admins` to keep passwords only as an administrator fallback, or `off` to disable them entirely.

## 4. Email

Password resets, invitations and enquiry notifications need an email service. Add these in Vercel (any SMTP provider: your email host, Resend, Postmark, SES and others):

`SMTP_HOST`, `SMTP_PORT` (usually 587), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (for example `website@yourcompany.com`) and optionally `SMTP_FROM_NAME` and `FORM_NOTIFY_EMAIL`.

Without email, enquiries are still stored under **Enquiries** in the admin.

## 5. Your domain

Vercel → project → **Settings → Domains** → add your domain and follow the DNS instructions. Then set `NEXT_PUBLIC_SERVER_URL=https://yourdomain.com` for Production, add the domain to your Google OAuth redirect URIs, and redeploy.

## Updates

Your repository includes a weekly **Design OS updates** GitHub Action. When a new release is out it opens a pull request:

- Vercel builds a **Preview** of the update on a separate database branch. Open it from the pull request and check your site.
- **Merge** the pull request to update the live site. The database is updated during that deployment.
- Files you (or your AI) customised are never overwritten. If the update also changed one of them, the pull request says so and saves the new version beside yours as `<file>.designos-upstream` for review. Ask Claude Code to "merge the Design OS update conflicts".

The admin Overview also shows when an update is available. To allow the Action to open pull requests, enable **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests** in your repository. You can also run it any time from the **Actions** tab (**Run workflow**).

Before merging an update with database changes, it's wise to confirm your Neon backups (Neon → your project → **Backup & Restore**) cover at least the last day.

## Work on the site with Claude Code

Clone your repository, then connect it to your Vercel project so the AI tools can reach the CMS:

```sh
git clone https://github.com/<you>/<your-site>.git && cd <your-site>
npm ci
npx vercel link
npx vercel env pull .env.production.local --environment=production
npm run ai:connect
```

Open the folder in Claude Code and approve the `design-os` tools. See [AI_TOOLKIT.md](AI_TOOLKIT.md). The Production connection is read-only; design and content work happens on a branch and its Preview.

## Languages

Add languages in **Site Settings → Additional languages**. Translated pages appear at `/<code>/…` (for example `/fr/about`); untranslated fields show your main language. The main language is English by default; for a site whose main content is in another language, set `DESIGNOS_DEFAULT_LOCALE` (for example `fr`) **before** your first deployment.

## Other ways to install

- **Guided local installer** (creates everything from your computer; needs Node.js 22+ and Git): see [NEW_SITE.md](NEW_SITE.md).
- **Clean starter export** for developers: also in [NEW_SITE.md](NEW_SITE.md).

## Settings reference

| Variable                                                            | Needed               | Purpose                                                                     |
| ------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| `DESIGNOS_SETUP_CODE`                                               | Yes (hosted)         | Protects the one-time `/setup` page                                         |
| `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`                             | Added by Vercel      | Database and image storage                                                  |
| `DESIGNOS_PREVIEW_DATA=branch`                                      | Preview only         | Confirms previews use separate Neon branches                                |
| `PAYLOAD_SECRET`, `CRON_SECRET`                                     | Optional             | Derived from your database credentials if not set; set explicitly to rotate |
| `NEXT_PUBLIC_SERVER_URL`                                            | With a custom domain | Canonical address for links, sitemaps and sign-in                           |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ALLOWED_DOMAIN` | Optional             | Sign in with Google                                                         |
| `PASSWORD_SIGN_IN`                                                  | Optional             | `all` (default), `admins` or `off`                                          |
| `SMTP_*`, `FORM_NOTIFY_EMAIL`                                       | Recommended          | Email                                                                       |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                        | Optional             | Cloudflare Turnstile spam protection on forms                               |
| `DESIGNOS_DEFAULT_LOCALE`                                           | Before first deploy  | Main content language (default `en`)                                        |
| `DESIGNOS_AUTO_MIGRATE=false`                                       | Rarely               | Apply database migrations by hand instead of on deploy                      |
