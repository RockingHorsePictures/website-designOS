# Your website workspace

Open **your-site.com/admin** and sign in, with Google if your administrator has set it up, or with your password. Everything happens here: editing, publishing, enquiries and your team. The workspace has light and dark appearances, separate from your website's branding.

## Overview

The dashboard shows whether your site is live and up to date, your pages, posts and new enquiries, a **Getting started** checklist, recent edits and quick actions. **New page** creates a page (blank, from a simple starter, or from one of your templates) and opens it in the composer. Administrators can **Invite a teammate** here.

## Save, preview and publish

Nothing you edit reaches visitors until you publish the whole site:

1. Edit pages, posts, settings, colours, fonts, logos or navigation. **Save**, **Save to workspace** and **Save draft** store edits in your workspace only.
2. On **Overview**, choose **Save to Preview**. This captures the whole saved workspace, including saved drafts, as a fixed version. Unsaved form changes are left out.
3. Open **View Preview**. The `/preview` address can be shared for review and is hidden from search engines. Later edits don't change it until you save another Preview.
4. Choose **Publish to Live** and confirm. Exactly the version you reviewed goes live.
5. **Unpublish site** shows **Coming soon** instead, keeping all content. Publish again whenever you're ready.

New sites show Coming soon until first published. Code updates don't overwrite your content.

The **Preview / Live Preview** buttons on an individual page show your working draft at `/workspace-preview` (only when signed in). This is separate from the shareable site Preview.

## Pages and the composer

**Open page composer** (or **New page** on Overview) opens the visual editor:

- Add sections from the left panel, drag to reorder, and edit each section's fields on the right. Preview at mobile, tablet and desktop sizes. Press **Save draft** (or Ctrl/⌘ + S).
- Your website's own sections appear alongside the base set: hero, text, text and image, image, gallery, video, embed (maps, booking calendars, forms and more), feature list, steps, pricing, figures, testimonials, client logos, questions and answers, services, team, case studies, blog posts, form, call to action and contact.
- **Columns** hold other sections side by side. **Reusable block** shows a group of sections you manage once under **Reusable blocks**, such as a call to action used on many pages.
- Each section can have an **Entrance animation**. Visitors who prefer reduced motion never see it.
- In text fields a blank line starts a new paragraph; use `## ` for a subheading, `- ` for a list, `**bold**` and `[link text](/page)`.
- Sections showing services, case studies, people, clients or posts use those records, so edit the record once and every page updates. Link figures and testimonials to an **Approved Fact**.
- **Page header → Hide** lets the first section (a Hero) act as the page title.

Every page has a title, a web address (slug) and a summary. Add new pages to **Navigation** so visitors can find them. Changing a published page's address creates a redirect automatically. **Include in site releases** leaves a page out of the next Preview without deleting it.

- **Page template**: tick this on a page to make it a starting point for new pages. Templates are never published.
- **Password protected**: visitors must enter the page password (set it on the page) to see it. Useful for client previews or private information. Protected pages are hidden from search engines, search results and feeds.

## Blog

**Blog posts** have a title, address, summary, image, body text, authors (from Team), categories and related posts. They appear at `/blog`, with a page per category, an RSS feed at `/blog/feed.xml`, and a **Blog posts** section you can add to any page. **Publication date shown** overrides the date displayed.

## Forms and enquiries

Build forms under **Enquiries → Forms**: add fields (text, email, phone, message, choice, checkbox, number, date, web address), mark required ones, and set the button label and thank-you message. Place a form on a page with the **Form** section. Contact sections include a simple built-in form.

Submissions arrive under **Enquiries** (visible to editors and administrators, never to AI accounts). Mark them replied or archived, and delete ones you no longer need, because they contain personal data. Administrators can set, per form, **email notifications** (needs email configured), a **webhook** to send each submission to Zapier, Make, Slack or a CRM (signed so the receiver can verify it came from your site), and a page to redirect to after sending. Spam is filtered with a hidden trap field and rate limits; Cloudflare Turnstile can be switched on (see docs/DEPLOY.md).

## Languages

Add languages in **Site Settings → Additional languages**. A language selector then appears at the top of the admin: switch to it, and translate titles, text, sections and search fields. Anything not yet translated shows your main language. In the composer, use the language buttons in the top bar. Translated pages live at `/<code>/…` (for example `/fr/about`), and search engines are told which pages are translations of each other.

## Your brand

- **Theme tokens**: colours (use the swatch or a six-digit hex value) and fonts and weights; the sample updates as you edit.
- **Font files**: upload licensed WOFF2 or WOFF fonts (up to 2 MB each), then choose **Custom uploaded font** in Theme. Add regular, bold and italic faces separately, or enter the weight range for a variable font. Font sizes and layout stay in the website's design code.
- **Site Settings**: logos (main, and one for dark backgrounds), browser icon, company details, address, language and organisation type (used by search engines), announcement bar, analytics and cookie notice, search engine verification codes, and the page-not-found message.

The media library accepts PNG, WebP, JPEG and AVIF (not SVG). Transparent PNG or WebP suits logos; use a square PNG for the icon. Give every meaningful image a description (alt text), or mark it decorative.

Files included in a saved release are kept: upload a new file rather than replacing or deleting one. Only files used by your published site are publicly accessible.

## Approvals and locks

Open **Approvals & locks** at the bottom of a saved record or settings form (save the form first).

| State            | Meaning                                            |
| ---------------- | -------------------------------------------------- |
| Editable default | A starting point AI may adapt within your brief.   |
| Approved         | A person approved the choice; it remains editable. |
| Locked           | Changes are rejected until a person unlocks it.    |

For example, lock **Background** to keep it white while leaving Accent editable. Your edits are recorded as approved; a value matching a default is not treated as approved. Reload the form after changing approvals.

**AI contributor** accounts can read approvals and edit unlocked content. They can't unlock, approve, verify facts, delete, publish, read enquiries, or change where visitors' data goes (form delivery, analytics, verification codes). If AI needs a locked value changed, it will ask you to unlock it; lock it again after review. Repository and database administrators retain infrastructure-level control; AI coding tools must also follow AI_SITE_CONTRACT.md.

## Search and visibility

- **Overview → Site health** checks the whole site: missing search details, broken internal links, pages nothing links to, duplicate titles, images without descriptions, figures without evidence and missing company details. Each finding links to the fix.
- Each page's **Search & quality** tab has **Check this page** and shows its structured data.
- **Search Strategy** holds your audiences, questions and tone, and three crawler choices: search engines (Google, Bing), AI answer engines that read and cite your pages (ChatGPT search, Perplexity, Claude and others), and AI model-training crawlers (off by default).
- The site publishes a sitemap, `/llms.txt` (a plain summary for AI assistants), structured data from your visible content, and a generated sharing image for pages without their own. Site search is at `/search`. Previews are never indexed.

Verified facts belong in **Approved Facts & Evidence**. Warnings are advisory; publication blockers must be fixed.

## History

**Versions** on each record restore earlier content into your workspace without changing Live. Your current approvals and locks always stay: a restore that would change a locked field is refused until you unlock it. Scheduled document changes affect the workspace only; publish the site from Overview.

## Team and sign-in

Administrators invite people from **Overview → Invite a teammate** (or **Users**). Editors edit and publish; administrators also manage people and settings. With **Sign in with Google** set up, invited people just use their Google account. See docs/DEPLOY.md.

## Building with AI

Expand **Build your website with AI** on Overview for instructions to paste into Claude Code or another AI tool. For a separate company, see docs/DEPLOY.md: each website gets its own repository, database, uploads and credentials.
