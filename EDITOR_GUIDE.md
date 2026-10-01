# Your website workspace

Open **your-site.com/admin** and sign in, with Google if your administrator has set it up, or with your password. Everything happens here: editing, publishing, enquiries and your team. This is the only place you edit your website. Use the same address every time, whatever you're working on. The workspace has light and dark appearances, separate from your website's branding.

## Overview

The dashboard shows whether your site is live and up to date, your pages, posts and new enquiries, a **Getting started** checklist, recent edits and quick actions. **New page** creates a page (blank, from a simple starter, or from one of your templates) and opens it in the composer. Administrators can **Invite a teammate** here.

## Save, preview and publish

Nothing you edit reaches visitors until you publish the whole site:

1. Edit pages, posts, settings, colours, fonts, logos or navigation. Every screen's save button (**Save**, **Save to workspace** or **Save draft**) keeps edits private to your workspace.
2. On **Overview**, choose **Save to Preview**. This captures the whole saved workspace, including saved drafts, as a fixed version. Unsaved form changes are left out.
3. Open **View Preview**. The `/preview` address can be shared for review and is hidden from search engines. Later edits don't change it until you save another Preview.
4. Choose **Publish to Live** and confirm. Exactly the version you reviewed goes live.
5. **Unpublish site** shows **Coming soon** instead, keeping all content. Publish again whenever you're ready.

New sites show Coming soon until first published. Unsaved changes (including in the composer) are not part of a Preview, so save first. Design OS updates never overwrite your content; they can change how the site looks, which is why each update is reviewed on its own preview before it goes live (see [docs/DEPLOY.md](docs/DEPLOY.md#updates)).

Two kinds of preview, both on your normal address:

- **Page preview**: the **Preview / Live Preview** buttons on a page show just that page's saved draft, only to you (at `/workspace-preview`).
- **Site Preview**: the whole site as a fixed, shareable version (at `/preview`), created with **Save to Preview**.

### Code previews are different

When your website's code changes (a new design from your AI, or a Design OS update), Vercel builds a **code preview** at its own random address and links it from the pull request on GitHub.

- **What it's for:** it shows the code change working, with a dark **Code preview** banner across the top.
- **Read-only:** it runs on a throwaway copy of your content, so nothing can be saved there.
- **Making the change live:** merge the pull request on GitHub.
- **After merging:** if the change adds new sections, place and fill them in your normal admin, then **Save to Preview** and **Publish to Live** as usual.

The rule of thumb:

- **Content** (text, images, pages, order, settings): _your admin → Save to Preview → Publish to Live_.
- **Code** (designs, new sections, updates): _pull request → check the code preview → merge_.

## Pages and the composer

**Open page composer** (or **New page** on Overview) opens the visual editor:

- Add sections from the left panel, drag to reorder, and edit each section's fields on the right. Preview at mobile, tablet and desktop sizes. Press **Save draft** (or Ctrl/⌘ + S).
- Your website's own sections appear alongside the base set: hero, text, text and image, image, gallery, video, embed (maps, booking calendars, forms and more), feature list, steps, pricing, figures, testimonials, client logos, questions and answers, services, team, case studies, blog posts, form, call to action and contact.
- **Columns** hold other sections side by side. **Reusable block** shows a group of sections you manage once under **Reusable blocks**, such as a call to action used on many pages.
- Each section can have an **Entrance animation**. Visitors who prefer reduced motion never see it.
- Text fields use simple formatting:

  ```text
  A paragraph. Leave a blank line for the next one.

  ## A subheading

  - A bullet point
  - **Bold words** and a [link to a page](/about)
  ```

- Sections showing services, case studies, people, clients or posts use those records, so edit the record once and every page updates. Link figures and testimonials to an **Approved Fact**.
- **Page header → Hide** lets the first section (a Hero) act as the page title.

Every page has a title, a web address (slug) and a summary. On **Team** records, **Active** decides whether a person appears on the site. Add new pages to **Navigation** so visitors can find them. Changing a published page's address creates a redirect automatically. **Include in site releases** leaves a page out of the next Preview without deleting it.

- **Page template**: tick this on a page to make it a starting point for new pages. Templates are never published.
- **Password protected**: visitors must enter the page password (set it on the page) to see it. Useful for client previews or private information. Protected pages are hidden from search engines, search results and feeds.

## Ordering lists

Pages, services, case studies, team, blog posts, categories and clients each have a **custom order**:

- **Drag** rows by the handle on the left of the list. Lists open in the custom order. If you've sorted by another column, click the **Order** column heading to get the handles back.
- **Or type a Position** on the record's edit screen (right-hand side): 1 is first. A number past the end moves it to the end.
- New records join the end.

Where each kind of record appears on the site, **Site Settings → Listing order** chooses how it's ordered: **Custom order**, **Newest first**, **Oldest first**, **A to Z** or **Z to A**. By default, blog posts are newest first, clients A to Z, and everything else follows your custom order. List sections in the composer (Services, Team, Clients, Selected projects, Blog posts) have their own **Order** option, which can override Site Settings for that section. Records you choose by hand in a section keep the order you picked them in, and **Latest** always means newest first.

As with any change, the new order shows on the site after your next **Save Preview** and **Publish**.

## AI editing

Your AI coding tool can work on your content directly, as drafts in this workspace, so you never upload files or copy and paste.

1. **Connect it once.** In your website's folder, ask your AI to run `npm run ai:connect -- live <your address>`. Open the link it shows, check the code matches, and choose **Connect**.
2. **Allow edits when you want them.** On **Overview → AI editing**, choose **Allow edits for 1 day** or **7 days**. The rest of the time your AI can read your site but not change it. **Turn off** stops edits at once, and **Disconnect** removes the connection.
3. **Review what changed.** **Changes by AI since your last Preview** lists each record your AI added or changed, and which fields. Open one to check it, or choose **Undo**. Undo puts back what was there before, except fields you've changed yourself since, which are kept.
4. **Share and publish as usual.** Nothing your AI writes is visible to anyone until you **Save to Preview** (share `/preview` with your team), and nothing goes live until you **Publish to Live**.

Your AI can't save a Preview, publish, approve, unlock, change locked fields, delete or manage people. If you and your AI edit the same record, its save is refused until it re-reads your version, so your edits are never overwritten.

## Importing content

Administrators can bring in a **content bundle**: a single `.zip` with pages, records, settings and images, usually made by your AI from the copy of the site it designed (`npm run content:export`).

1. On **Overview**, choose **Import content** and pick the bundle.
2. Check the summary: what will be **new** and what will be **updated** (records with the same web address, name or file). Choose whether to also import site settings, navigation and theme, and whether to remove demo content.
3. Choose **Import into workspace** and keep the window open until it finishes.

Imported content goes into your workspace, not the live site. Links between records are reconnected, and nothing is marked as approved, so review it first, then **Save to Preview** and **Publish to Live**. Importing the same or an updated bundle again updates what the first import created. Page passwords and form webhook secrets aren't transferred, so set them again if you use them.

## Blog

**Blog posts** have a title, address, summary, image, body text, authors (from Team), categories and related posts. They appear at `/blog`, with a page per category, an RSS feed at `/blog/feed.xml`, and a **Blog posts** section you can add to any page. **Publication date shown** overrides the date displayed.

## Forms and enquiries

Build forms under **Enquiries → Forms**: add fields (text, email, phone, message, choice, checkbox, number, date, web address), mark required ones, and set the button label and thank-you message. Place a form on a page with the **Form** section. Contact sections include a simple built-in form.

Submissions arrive under **Enquiries** (visible to editors and administrators, never to AI accounts). Mark them replied or archived, and delete ones you no longer need, because they contain personal data.

Administrators can set, per form (under **Delivery**):

- **Email notifications**: needs email set up (see [docs/DEPLOY.md](docs/DEPLOY.md#5-email)). Contact-section enquiries go to the Site Settings email or `FORM_NOTIFY_EMAIL`.
- **Webhook**: sends each submission to Zapier, Make, Slack or a CRM, signed so the receiver can check it really came from your site.
- **After sending, go to**: a thank-you page.

Spam is filtered with a hidden trap field and rate limits; stronger protection (Cloudflare Turnstile) can be switched on ([docs/DEPLOY.md](docs/DEPLOY.md#spam-protection-optional)).

## Languages

Add languages in **Site Settings → Additional languages**. A language selector then appears at the top of the admin: switch to it, and translate titles, text, sections and search fields. Anything not yet translated shows your main language. In the composer, use the language buttons in the top bar. Translated pages live at `/<code>/…` (for example `/fr/about`), and search engines are told which pages are translations of each other.

## Your brand

- **Theme tokens**: colours (use the swatch or a six-digit hex value) and fonts and weights; the sample updates as you edit.
- **Font files**: upload WOFF2 or WOFF fonts you are licensed to use on this website (up to 2 MB each), then choose **Custom uploaded font** in Theme. Add regular, bold and italic faces separately, or enter the weight range for a variable font. Font sizes and layout stay in the website's design code.
- **Site Settings**: logos (main, and one for dark backgrounds), browser icon, company details, address, language and organisation type (used by search engines), announcement bar, analytics and cookie notice, search engine verification codes, and the page-not-found message.

The media library accepts PNG, WebP, JPEG and AVIF (not SVG). Transparent PNG or WebP suits logos; use a square PNG for the icon. Give every meaningful image a description (alt text), or mark it decorative.

Files included in a saved release are kept: upload a new file rather than replacing or deleting one. A release keeps the image and font details it was saved with; later changes apply to the next release. Only files used by your published site are publicly accessible.

## Approvals and locks

Open **Approvals & locks** at the bottom of a saved record or settings form (save the form first).

| State            | Meaning                                            |
| ---------------- | -------------------------------------------------- |
| Editable default | A starting point AI may adapt within your brief.   |
| Approved         | A person approved the choice; it remains editable. |
| Locked           | Changes are rejected until a person unlocks it.    |

For example, lock **Background** to keep it white while leaving Accent editable. Your edits are recorded as approved, with who approved them and when; a value that happens to match a default is not treated as approved. Reload the form after changing approvals.

**AI contributor** accounts can read approvals and edit unlocked content. They can't unlock, approve, verify facts, delete, publish, read enquiries, or change where visitors' data goes (form delivery, analytics, verification codes). If AI needs a locked value changed, it will ask you to unlock it; lock it again after review.

## Search and visibility

- **Overview → Site health** checks the whole site: missing search details, broken internal links, pages nothing links to, duplicate titles, images without descriptions, figures without evidence and missing company details. Each finding links to the fix.
- Each page's **Search & quality** tab has **Check this page** and shows its structured data.
- **Search Strategy** holds your audiences, questions and tone, and three crawler choices: search engines (Google, Bing), AI answer engines that read and cite your pages (ChatGPT search, Perplexity, Claude and others), and AI model-training crawlers (off by default). These choices take effect with your next published release.
- The site publishes a sitemap, `/llms.txt` (a plain summary for AI assistants), structured data from your visible content, and a generated sharing image for pages without their own. Site search is at `/search`. Previews are never indexed.

Verified facts belong in **Approved Facts & Evidence**. Warnings are advisory; publication blockers must be fixed.

## History

**Versions** on each record restore earlier content into your workspace without changing Live. Your current approvals and locks always stay: a restore that would change a locked field is refused until you unlock it. Scheduled document changes affect the workspace only; publishing the whole site on a schedule isn't available yet, so publish from Overview.

## Team and sign-in

Administrators invite people from **Overview → Invite a teammate** (or **Users**). Editors edit and publish; administrators also manage people and settings. With **Sign in with Google** set up, invited people just use their Google account. See [docs/DEPLOY.md](docs/DEPLOY.md#4-optional-sign-in-with-google).

## Building with AI

Expand **Build your website with AI** on Overview for instructions to paste into Claude Code or another AI tool. For a separate company, see [docs/DEPLOY.md](docs/DEPLOY.md): each website gets its own repository, database, uploads and credentials.
