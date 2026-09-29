---
name: designos-content
description: Create or edit website content in a Design OS CMS through the AI bridge — new pages composed from sections, services, case studies, team, FAQs, navigation, search fields and images — as workspace drafts the owner reviews and publishes. Use when asked to add a page, write or update copy, add FAQs, or fix content found by an audit.
---

# Edit content safely

All writes are **workspace drafts** made by a restricted AI account. The owner reviews them, saves a site Preview and publishes. You cannot approve, delete or publish.

1. `designos_check`, then `designos_context`. Note locked and approved fields. Production is read-only; write to `preview` (code-preview CMS) or `local`.
2. Read what exists before writing (`cms_read`), to avoid duplicates and keep the owner's voice. Read Search Strategy for tone, terminology and prohibited claims.
3. Facts: use verified Approved Facts or what the owner tells you in this conversation. Add new facts as Approved Facts with a source note (left `pending`). Set `aiAssisted: true` on records with AI-drafted claims. Never set `claimsReviewed` or verify facts.
4. **Pages**: `list_sections` for available sections and their props. Build `composition` as `{ "root": { "props": { "pageHeader": "default" } }, "content": [ { "type": "Hero", "props": { "id": "hero-1", … } } ] }`. Every section needs a unique `id` and all its props. Run `validate_composition`, then `cms_write` create on `pages` with `title`, `slug`, `summary` (required, visible), `seo` fields and `composition`.
5. **Records**: services, case studies and team members are collections. Reference them from sections by ID rather than copying their text.
6. **Images**: `cms_upload_image` with a real description; mark purely decorative images decorative.
7. **Navigation**: update the `navigation` global only if asked; keep labels short.
8. **Search fields**: write `seo.title` (about 60 characters), `seo.description` (about 150), `seo.topic`, `seo.intent` and questions the page answers.
9. Finish with `site_health` for the environment and fix what you introduced. Tell the owner exactly what changed, where to review it (`/admin`, or `/workspace-preview/<slug>` for a draft), and that they publish via **Overview → Save to Preview → Publish to Live**.
