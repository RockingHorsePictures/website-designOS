# Your Design OS workspace

Open **your-site.com/admin** and sign in. This is the single place for editing and publishing. The admin has light and dark appearances with blue accents, separate from website branding.

## Save, preview and publish

1. Edit pages, settings, colours, fonts, logos or navigation. **Save**, **Save to workspace** and **Save Draft** store edits in the workspace. They do not change Live.
2. In **Overview**, choose **Save to Preview**. This captures the whole saved workspace, including saved page drafts, as a fixed version. Unsaved form changes are excluded.
3. Open **View Preview**. Its `/preview` address can be shared and is excluded from search indexing. Later edits do not change it until you save another Preview.
4. Choose **Publish to Live**, then confirm. The exact reviewed Preview version becomes Live. Later workspace edits stay separate.
5. **Unpublish site** replaces Live with **Coming soon**, preserving content, assets and Preview. Publish again whenever ready.

New installations show Coming soon until first publication. Code deployments do not reset the saved releases or overwrite content with another environment's data. Code releases can change rendering and admin features, so developers must test and review those separately.

## Edit content

Pages, Case Studies and Services hold structured content. Edit the title, URL slug, summary, images and relationships, then save. **Include in site releases** controls whether a page belongs in the next Preview. Turn it off to remove a page from the next release without deleting its workspace record. Moving a document to draft does not exclude it from a whole-site release.

The individual **Preview / Live Preview** controls show an authenticated working draft at `/workspace-preview`. This is separate from the fixed, shareable site Preview. The page composer previews unsaved section edits; choose **Save draft** before creating a site Preview.

Use **Open page composer** to arrange approved sections. Structured project and service sections reference their records rather than copying their content. Use Team's Active setting to include or exclude people from the next release, and Order to arrange them. Saved URL changes can create workspace redirects, included in the next release.

## Approvals and locks

Open **Approvals & locks** at the bottom of a saved record or settings form. Save the form first.

| State            | Meaning                                            |
| ---------------- | -------------------------------------------------- |
| Editable default | A starting point AI may adapt within your brief.   |
| Approved         | A person approved the choice; it remains editable. |
| Locked           | Changes are rejected until a person unlocks it.    |

For example, lock **Background** to preserve white while leaving Accent editable. Human edits are recorded as approved; matching a default does not imply approval or a lock. Changes record who approved them and when. Reload the form after changing approvals.

An **AI contributor** account can read approvals and edit unlocked content. It cannot unlock or publish. If AI needs a locked value changed, it should identify the conflict and ask you to unlock it. Review and save the change, then lock it again. Repository/database administrators retain infrastructure-level control; coding workspaces must obey AI_SITE_CONTRACT.md as well as these CMS checks.

## Colours, fonts and logos

In Theme tokens, use the colour swatch or enter a six-digit hex value. Under Fonts & weights, select heading/body fonts and weights; the sample updates while editing. Save, then create a Preview to review the website together.

Upload licensed WOFF2 or WOFF fonts, up to 2 MB each, in Font files. Add regular/bold/italic faces separately, or enter minimum and maximum weights for a variable font. Choose Custom uploaded font in Theme and select the matching family files. Font sizes and layout stay in website design code.

Site Settings contains main/inverse logos and the browser icon. The library accepts PNG, WebP, JPEG and AVIF; SVG uploads are not enabled. Transparent PNG/WebP suits logos; use a square PNG for the icon.

Files included in a saved release are retained. Upload a new file instead of replacing or deleting a retained file. Release content and font/image metadata remain frozen; later selections apply to a later release. Upload only fonts licensed for this website.

## Search, history and AI

Search & quality checks identify missing metadata, unsafe composition and factual claims needing review. Verified facts belong in Approved Facts & Evidence. Warnings are advisory; publication blockers must be fixed. Crawler choices are released with the site. Local, code-testing and content Preview pages are not indexed.

Document Versions restore content into the workspace, without overwriting Live. Scheduled document operations affect workspace state only. Whole-site scheduled publication is not implemented; publish the reviewed site explicitly from Overview.

Version restoration cannot reset approvals or bypass a current lock. If an older version carries different approval records, copy the desired values into unlocked fields and save them instead; approval controls remain the place to change locks.

Expand Build your website with AI on Overview for a copyable handoff. Continue in the connected coding workspace. For a separate company, use NEW_SITE.md; each website gets its own repository, database, uploads and credentials.
