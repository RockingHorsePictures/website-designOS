# Install, set up and update your website

This takes about fifteen minutes and needs no software on your computer: just a free [GitHub](https://github.com) account and a [Vercel](https://vercel.com) account. (Company websites need Vercel's Pro plan; the free Hobby plan is for personal, non-commercial sites.)

## 1. Deploy

Click **Deploy with Vercel** in the [README](../README.md). The button installs the latest stable release. Vercel will:

1. Copy Design OS into a new private repository in your GitHub account.
2. Create a hosting project.
3. Add a **Neon Postgres** database and a **Blob** store for images. Accept both when asked. In the Neon step, keep **Preview** switched on. Every proposed change to your site's code (for example an update) is built as a private test copy called a _code preview_, and this gives each one its own copy of the database, so testing never touches your live site.
4. Ask for **DESIGNOS_SETUP_CODE**. Choose any private phrase of 8 or more characters. You'll type it once in step 3; it stops anyone else claiming your new site first.

The first deployment prepares the database and builds the site. Your address shows **Coming soon** until you publish.

## 2. Finish two settings

1. **Separate test data.** Without this, code previews (including update pull requests) stop with a message instead of building. That's safe, but you couldn't review updates.
   1. At [vercel.com](https://vercel.com), open your project and click **Environment Variables** in the left sidebar.
   2. In the form at the top: **Key** `DESIGNOS_PREVIEW_DATA`, **Value** `branch`. Under **Environments**, tick **Preview** only (untick Production and Development). Click **Save**.
   3. **Do this before step 2, or together with it:** switch on Neon's preview branching. Without it, previews use your live database, so the setting above would let previews change live data. The Deploy Button doesn't always switch it on.
      - In your project's left sidebar, click **Storage**, then click your Neon database (its name starts with `neon-`).
      - In the database's left sidebar, click **Projects**. On your project's row, click the **⋮** menu at the far right and choose **Update Project Connection**.
      - In the **Configure** window, under **Create Database Branch For Deployment**, tick **Preview** only. Leave **Production** unticked, or every live deploy would start from a fresh database copy. Leave everything else unchanged, and click **Save Changes**.
   4. As a safety net, every code preview checks that it isn't using the live database. If it is, it stops before changing anything and says how to fix it.
2. **Allow automatic updates.** In GitHub, open your new repository → **Settings** → **Actions** → **General** → tick **Allow GitHub Actions to create and approve pull requests** → **Save**. After step 3, also click **Turn on automatic updates** on your admin Overview. Vercel's copy of Design OS leaves out GitHub's workflow folder, so this opens GitHub with the update workflow filled in. Click **Commit changes**.

## 3. Create your administrator

Open `https://<your-site>.vercel.app/setup`. Enter the setup code, your company name, your name and email, and choose how you'll sign in. You'll land in your workspace at `/admin`. The setup page stops working once an administrator exists.

## 4. Optional: Sign in with Google

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**.
2. Under **Authorised redirect URIs**, add `https://<your-domain>/api/auth/google/callback` (one line per address you use, including the `.vercel.app` one).
3. In Vercel, add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (Production), then redeploy (**Deployments** → latest → **Redeploy**).
4. Optional: `GOOGLE_ALLOWED_DOMAIN=yourcompany.com` allows only your Google Workspace accounts.

Only people you invite (**Overview → Invite a teammate**) can sign in; Google never creates accounts by itself. Once everyone uses Google, you can set `PASSWORD_SIGN_IN=admins` (passwords only as an administrator fallback) or `off`.

## 5. Email

Password resets, invitations and enquiry notifications need an email service. Any SMTP provider works: your email host, Resend, Postmark, Amazon SES and others. Add these in Vercel (Production):

| Variable            | Example (Resend)                                                   |
| ------------------- | ------------------------------------------------------------------ |
| `SMTP_HOST`         | `smtp.resend.com`                                                  |
| `SMTP_PORT`         | `587`                                                              |
| `SMTP_USER`         | `resend`                                                           |
| `SMTP_PASSWORD`     | your API key                                                       |
| `SMTP_FROM`         | `website@yourcompany.com` (a verified sender)                      |
| `SMTP_FROM_NAME`    | `Acme website` (optional)                                          |
| `FORM_NOTIFY_EMAIL` | where enquiries go (optional; defaults to the Site Settings email) |

Without email, enquiries are still stored under **Enquiries** in the admin.

## 6. Your domain

Vercel → project → **Settings → Domains** → add your domain and follow the DNS instructions. Then set `NEXT_PUBLIC_SERVER_URL=https://yourdomain.com` (Production), add the domain to your Google redirect URIs if you use Google sign-in, and redeploy.

## Spam protection (optional)

Forms already use a hidden trap field and rate limits. For stronger protection, create a free [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) widget for your domain and add `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Vercel. Every form then shows a quick check that visitors rarely notice.

## Updates

Every week your repository's **Design OS updates** Action checks for a new release and, if there is one, opens a pull request:

- Vercel builds a code preview of the updated site on its own database copy. Open it from the pull request and look around. It's read-only and shows a **Code preview** banner, because nothing saved there would be kept. Content is always edited at your live address's `/admin`.
- **Merge** the pull request to update your live site. The database is updated during that deployment.
- Files you (or your AI) customised are never overwritten. If an update also changed one of them, the pull request says so and saves the new version beside yours as `<file>.designos-upstream`. Ask Claude Code to "merge the Design OS update conflicts" before merging.

The admin Overview shows when an update is available. To check straight away, open **Actions → Design OS updates → Run workflow**. Before merging an update that changes the database, check that Neon backups cover at least the last day (Neon → your project → **Backup & Restore**).

## Work on the site with Claude Code

For design and development you'll need [Node.js 22+](https://nodejs.org), [Git](https://git-scm.com) and [Claude Code](https://claude.com/claude-code) on your computer. Then:

```sh
git clone https://github.com/<you>/<your-site>.git
cd <your-site>
npm ci
npx vercel link                      # choose your Vercel project
npx vercel env pull .env.production.local --environment=production
cp .env.example .env                 # local development database (see README → Develop locally)
npm run db:local                     # keep running in its own terminal
npm run migrate && npm run seed      # neutral demo content, local only
npm run ai:connect
```

Open the folder in Claude Code and approve the `design-os` tools ([AI_TOOLKIT.md](AI_TOOLKIT.md)). Claude reads your live site's content and approvals **read-only** (Production), designs and edits content against the **local** database, and works on a branch; its code preview is reviewed before you merge. Never copy the production database credentials into `.env`.

**Moving content built locally to the live site.** Ask Claude to run `npm run content:export`. It saves a `.zip` bundle in `.designos/` with the pages, records, settings and images. Then, on your live site, sign in as an administrator, choose **Overview → Import content** and pick the bundle. You'll see what will be added and updated before anything changes. Everything lands in your workspace: review it, then **Save to Preview** and **Publish to Live**. You can import an updated bundle again later. It updates what the first import created instead of duplicating it.

## Languages

Add languages in **Site Settings → Additional languages**. Translated pages appear at `/<code>/…` (for example `/fr/about`); untranslated fields show your main language. The main language is English unless you set `DESIGNOS_DEFAULT_LOCALE` (for example `fr`) **before** your first deployment.

## Other ways to install

- **Guided local installer** (creates everything from your computer; needs Node.js 22+ and Git): [NEW_SITE.md](NEW_SITE.md).
- **Clean starter export** for developers: also in [NEW_SITE.md](NEW_SITE.md).
- **Manual hosting setup**: [OPERATIONS.md](OPERATIONS.md#manual-deployment-without-the-deploy-button-or-installer).

## Settings reference

| Variable                                                                | When                     | Purpose                                                                                                                                      |
| ----------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `DESIGNOS_SETUP_CODE`                                                   | Required on hosted sites | Protects the one-time `/setup` page                                                                                                          |
| `DATABASE_URL`, `BLOB_STORE_ID` (or `BLOB_READ_WRITE_TOKEN`)            | Added by Vercel          | Database and image storage                                                                                                                   |
| `DESIGNOS_PREVIEW_DATA=branch`                                          | Preview only (step 2)    | Confirms code previews use separate database copies                                                                                          |
| `NEXT_PUBLIC_SERVER_URL`                                                | With a custom domain     | Your site's address for links, sitemaps and sign-in                                                                                          |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                              | Optional                 | Sign in with Google                                                                                                                          |
| `GOOGLE_ALLOWED_DOMAIN`                                                 | Recommended with Google  | Only accounts on your Google Workspace domain can sign in (invitations are still required)                                                   |
| `PASSWORD_SIGN_IN`                                                      | Optional                 | `all` (default), `admins` or `off`                                                                                                           |
| `TRUSTED_PROXY=1`                                                       | Self-hosting only        | Trust `X-Forwarded-For` from your own proxy for rate limits. Not needed on Vercel; without it, self-hosted sites share one rate-limit bucket |
| `SMTP_*`, `FORM_NOTIFY_EMAIL`                                           | Recommended              | Email                                                                                                                                        |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                            | Optional                 | Stronger spam protection                                                                                                                     |
| `DESIGNOS_DEFAULT_LOCALE`                                               | Before first deploy      | Main content language (default `en`)                                                                                                         |
| `PAYLOAD_SECRET`, `CRON_SECRET`                                         | Leave blank              | Created automatically; set only if a developer asks you to                                                                                   |
| `DESIGNOS_AUTO_MIGRATE=false`                                           | Leave blank              | Only if a developer manages database changes by hand                                                                                         |
| `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`, `INDEXNOW_KEY`    | Optional                 | Search engine tools (verification codes can also go in Site Settings)                                                                        |
| `AI_ENABLED`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_DAILY_LIMIT` | Optional                 | Automatic image descriptions via your own AI service ([ARCHITECTURE.md](ARCHITECTURE.md#media-and-optional-ai))                              |

## Good to know

- **Password-protected pages** hide their text, title and description from visitors without the password and from search engines. Images placed on them are served like any released image, so anyone with an image's exact address can open it. Don't use page passwords for confidential images or documents.
