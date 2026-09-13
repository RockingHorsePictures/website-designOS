# Design OS editor guide

The public pages are neutral test pages. They demonstrate how the editing system works; the company's visual website will be built later.

## Sign in

Open `/admin` on the running app. Use an administrator-provided account. Local demo credentials are in the ignored `.env` file (`SEED_EMAIL`, `SEED_PASSWORD`). An administrator can create editor accounts under Users. Password-reset delivery needs an email provider before launch; ask an administrator to reset an account meanwhile.

## Edit a page

1. Open Pages and choose a record.
2. Edit its title, summary and hero image. Use Media to upload an image, then write a meaningful description or mark it decorative.
3. Save Draft. Public visitors continue to see the previously published version.
4. Use Preview or Live Preview to see the saved draft. You must remain signed in. Choose Mobile, Tablet or Desktop. Standard form changes appear after saving; the page composer previews section changes immediately.
5. Open Search & quality and run Check this page. Fix blockers. Review warnings and recommendations; these are advisory.
6. Publish. A fresh public request sees the change immediately, without a code deployment.

## Arrange page sections

Save the normal form first, then click Open page composer. Add, edit, remove or reorder approved sections using the component library and outline. Selected case studies references real project records. Use the device controls to check widths. Click **Save draft** to persist changes. Return to the page editor to review and publish. If another window changed the page, reload before saving again.

## Case studies, services and team

Case Studies and Services are separate collections. Create a record, enter the required fields, select relationships/media and save a draft. Their public URLs are created automatically. Duplicate a record from its document menu, assign a unique URL slug, then review all copied fields before publication.

Add people under Team. Change Order to reorder them. Deactivate a person to remove them from the public team list. The layout adjusts to the number of active records.

Changing a **published** URL creates an internal redirect from the previous URL. Use Redirects for legacy URLs, then verify the destination. Loops and infrastructure destinations are rejected.

## Global content and colours

Navigation manages ordered primary, secondary and footer links. Site Settings manages company/contact/footer/social information. Theme tokens expose a small set of semantic colours. These globals save directly and affect the next public request; version history supports recovery. They do not have a separate draft-preview workflow in this foundation.

### Fonts and weights

Open **Theme tokens → Fonts & weights**. Choose body and heading fonts independently, then choose regular (400), medium (500), semibold (600) or bold (700) weights. Emphasis weight controls bold text. The sample responds before saving; **Save** applies the selection to the website and page composer without a code deployment. Refresh an already-open website/composer tab to see the saved choice. Payload's admin interface keeps its own typography.

Inter, Source Sans 3 and Lora are served with the app, including normal and italic styles. System sans serif, serif and monospace choices use fonts installed on the visitor's device; their exact appearance and intermediate weights can vary by device. Existing pages retain system fonts until changed. To add a specific brand font, provide its webfont files and licence to a coding agent, who adds it to the approved library. Font sizes and layout remain part of the website design.

## Media descriptions

Write what the image communicates in context. Avoid generic “image of” wording and unsupported identity/location guesses. Mark decoration as decorative to output an empty description. A page's per-use description can override the asset description.

When an automatic-description service is configured, new images can receive draft suggestions. Review them. Regenerate alt text suggestion loads a proposed replacement; save only after checking it. Your manual override remains intact unless you explicitly request a replacement. When AI is disabled, offline or budget-limited, upload and manual editing still work. Automatic suggestions are not configured by default.

## Evidence and search

Approved Facts & Evidence stores verified statements and source notes. Keep review dates current and attach relevant facts to content. AI-assisted claims require human review; an automated quality check cannot determine whether every statement is true.

Search fields default to the page title/summary and company name. Override them when useful. Hide from search excludes a page from indexing and the sitemap. Demo records are always excluded from production indexing.

Search Strategy stores audiences, topics, terminology, approved facts and reference URLs. It also separates search/discovery crawler access from model-training preferences. Production defaults allow discovery and deny GPTBot, ClaudeBot and Google-Extended training access. Local/preview sites deny all crawling regardless of these settings.

## Schedule and restore

Use the scheduled publish/unpublish controls in a document's publishing menu. Processing depends on the scheduled job runner and normally occurs within one minute of the chosen time when the hosted cron is active. Your administrator must verify that runner before relying on schedules.

Use Versions to compare or restore previous content. Review the restored version and publish it if required. An unpublished document returns 404 publicly. Contact an administrator for deleted-record/database recovery.

## Code changes

New visual sections, layout redesigns and new functionality require a developer/AI coding task. Those changes use Git, tests and a separate hosted preview. Editing ordinary content uses this CMS only.
