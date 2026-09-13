# Building the real website with an AI coding agent

This is a normal custom Next.js website with a working editing system. The coding agent designs and implements the frontend in this repository; Payload continues to own content. There is no runtime AI website generator inside the CMS.

## Starting point

Use the existing repository and start a design branch from `foundation/design-os` until PR #1 is reviewed and merged. The main branch does not yet contain the foundation. Read V5, IMPLEMENTATION_STATUS.md, ARCHITECTURE.md, EDITOR_GUIDE.md and AI_SITE_CONTRACT.md before editing. Run the existing application and inspect its editor.

## Inputs to provide

- Company identity, audience, site goals and priority enquiries/actions.
- Existing website/reference material approved as factual sources; approved copy and case-study information.
- Logo, imagery, video references and licensed webfont assets where relevant.
- Visual references with what you like or dislike about each, plus any firm constraints.
- Required pages, navigation and any functionality beyond the foundation.

Missing facts remain questions or clearly marked placeholders, never invented company claims.

## Intended workflow

1. Agree the sitemap and a content-to-template map using Pages, Case Studies, Services and Team. Add fields only for a real editorial need.
2. Establish a visual direction on representative views: homepage, one case study and one service, including mobile. Review those before extending the design throughout the site.
3. Implement custom React components and motion. Consume CMS data, semantic colours and the approved font/weight variables; keep sizes, spacing and responsive art direction in code.
4. Register reusable editable sections in the shared Puck schema/config and server renderer. Keep structured entities as references, preserve section IDs, and migrate any breaking content changes.
5. Verify editing, responsive previews, draft isolation, publishing, metadata, accessibility and real font/media loading. Review a protected Preview deployment against separate data.
6. Complete launch prerequisites and request a reviewed production release. Content editors then maintain the site through Payload without code deployments.

## Starting instruction to give an agent

> I authorise Phase 4 website design and implementation in this existing Design OS repository. Start from the completed foundation branch, read DESIGN_HANDOFF.md and AI_SITE_CONTRACT.md, and preserve the CMS, content contracts, preview, publishing and search architecture. Use the company assets, approved content and visual references I provide. First establish the sitemap and a coherent direction across the homepage, one case-study page and one service page, including mobile, for my review. All replaceable content must remain editable. Extend the approved section/font libraries where needed; do not scaffold a replacement app or invent company facts. Keep production unchanged until a separate release approval.

The example above is a prompt for a future task, not authorisation to start Phase 4 now.

## AI connection (0.2.1)

Before CMS work, read AI_CONNECTION.md. In the installed website folder run `npm run ai:check` and `npm run ai:context`; read fresh Production and code-preview approvals from `.designos/ai-context.json`. The installer provisions separate restricted accounts. If missing, use the documented `npm run ai:connect` repair after upgrading/migrating, not a request for the owner to paste passwords into chat. Use `npm run ai:request` for automated CMS operations. Production access is read-only and its approvals are authoritative. Browser-only conversations can use the admin’s credential-free context download for planning, but need a connected coding runtime for writes.
