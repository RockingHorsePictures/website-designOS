# Building the real website with an AI coding agent

This is a normal custom Next.js website with a working editing system. The coding agent designs and implements the frontend in this repository; Payload continues to own content. There is no runtime AI website generator inside the CMS. In Claude Code, `/designos-build` runs this workflow.

## Principle: bespoke design, manageable structure

Every site should look made for its company. The CMS structure (sections, records, tokens, locks, releases) is what makes it manageable afterwards; it should not make sites look alike.

- Design first, from the brief and references. Then express each distinctive block as an editable section with the smallest useful set of props (SECTIONS.md).
- The base section library is a fallback for owners adding pages after launch. Use a base section only where it genuinely fits, restyled to the design.
- Keep art direction, layout, motion and responsive behaviour in code. Keep copy, images, record choices and meaningful options editable.

## Starting point

Use the existing repository and start a design branch from `foundation/design-os` until PR #1 is reviewed and merged; `main` does not yet contain the foundation. Read AI_SITE_CONTRACT.md, SECTIONS.md, IMPLEMENTATION_STATUS.md, ARCHITECTURE.md and EDITOR_GUIDE.md before editing. Run the application and inspect its editor.

## Inputs to provide

- Company identity, audience, site goals and priority enquiries or actions.
- Existing website or reference material approved as factual sources; approved copy and case-study information.
- Logo, imagery, video references and licensed webfont files where relevant.
- Visual references with what you like or dislike about each, plus firm constraints.
- Required pages, navigation and any functionality beyond the foundation.

Missing facts remain questions or clearly marked placeholders, never invented company claims.

## Workflow

1. **Structure.** Agree the sitemap and a content-to-template map using Pages, Case Studies, Services, Team and Clients. Add fields only for a real editorial need.
2. **Direction.** Establish a visual direction on representative views: homepage, one case study and one service, on mobile and desktop. Two routes, both valid:
   - **In Claude Code (default):** render two or three distinct directions as real pages, screenshot them and iterate with the owner.
   - **Claude Design exploration (optional):** best for exploring many options quickly or collaborating visually on a canvas. Prepare a brief with `/designos-import-design` so designs respect the editing model and any locked brand values. When the owner is happy, use Claude Design's handoff to Claude Code (or an HTML/zip export, or screenshots) and continue with `/designos-import-design`. Treat the design as visual intent: its copy is placeholder until approved, and its code is rebuilt as editable sections, not pasted.
3. **Build.** Implement custom React components and motion. Consume CMS data, semantic colour tokens and the approved font and weight variables; keep sizes, spacing and responsive art direction in code. Register each editable block as a section (`/designos-new-section`); keep structured entities as references, preserve section types and props, and migrate any breaking changes.
4. **Content.** Compose pages from sections with the MCP tools (`list_sections`, `validate_composition`, `cms_write`) as drafts, using approved facts only (`/designos-content`).
5. **Verify.** Editing, reordering and removing every section in the composer; responsive previews; draft isolation; publishing; metadata and structured data; accessibility; real font and media loading. Run `/designos-audit` on the protected Preview, which uses separate data.
6. **Launch.** Complete `/designos-launch-check` and request a reviewed production release. Content editors then maintain the site through Payload without code deployments.

## Starting instruction to give an agent

> I authorise website design and implementation in this existing Design OS repository. Start from the completed foundation branch, read DESIGN_HANDOFF.md, SECTIONS.md and AI_SITE_CONTRACT.md, and preserve the CMS, content contracts, preview, publishing and search architecture. Design something bespoke to this company from the assets, approved content and visual references I provide; the base sections are only a fallback. First establish the sitemap and a coherent direction across the homepage, one case-study page and one service page, including mobile, for my review. All replaceable content must remain editable as sections I can manage myself. Do not scaffold a replacement app or invent company facts. Keep production unchanged until a separate release approval.

The example above is a prompt for a future task, not authorisation to start now.

## AI connection

Before CMS work, read AI_CONNECTION.md. Use `designos_check` and `designos_context` (MCP) or `npm run ai:check` and `npm run ai:context`, and read fresh approvals from `.designos/ai-context.json`. Production access is read-only and its approvals are authoritative. Browser-only conversations can use the admin's credential-free context download for planning, but need a connected coding runtime for writes.
