---
name: designos-import-design
description: Bring a Claude Design (or other design tool) exploration into a Design OS site — prepare a design brief that keeps designs editable, then translate a handoff bundle, exported HTML/zip, share link or screenshots into theme tokens, fonts and bespoke CMS-editable sections. Use when the owner mentions Claude Design, a design handoff, a mockup, prototype or visual reference to implement.
---

# Claude Design → Design OS

Claude Design is good at fast visual exploration. Claude Code turns the chosen direction into production components wired to the CMS. Treat the design as **visual intent**, not code to paste: prototypes hard-code copy and styles, while a Design OS site must keep content editable.

## 1. Before designing: give Claude Design the right constraints

Write `.designos/design-brief.md` for the owner to paste or attach in Claude Design. Include:

- Company, audiences, goals, tone and page list (from the Search Strategy global and the agreed sitemap).
- Brand assets and any **locked** theme values from `designos_context` (colours, fonts, logos that must not change).
- The editing model: the site is built from reorderable sections; copy and images must be swappable; structured lists (services, case studies, team, clients) come from records; colours map to eight semantic tokens (canvas, surface, text, muted, accent, highlight, border, inverse); fonts are one heading and one body family with weights.
- Accessibility: WCAG AA contrast, visible focus, reduced-motion alternatives.
- Ask for mobile and desktop frames of the homepage, one service and one case study.

Claude Design can also import a design system from this repository. If the owner uses that, point it at this repo so it sees `src/design-system/` and the current section styles.

## 2. Receive the design

Accept whatever arrives. Formats vary, so inspect rather than assume:

- **Handoff to Claude Code** bundle in this session or folder: read every file (README or instructions first, then HTML/CSS/JS/components, then assets).
- **Downloaded zip or standalone HTML**: unzip into `.designos/design-import/<name>/` (git-ignored) and read it.
- **Share link or screenshots**: view them; ask for an export if detail is missing.

## 3. Translate

1. **Tokens.** Extract the palette and map it onto the semantic tokens; propose values for the owner to approve (via `cms_write` to the `theme` global, unlocked fields only). Extra colours used for art direction stay in the site stylesheet as derived values; do not add raw colour props to sections.
2. **Type.** Identify fonts. Use licensed files only: the owner uploads WOFF2 to Font files, or pick an available registry font. Sizes, spacing and rhythm go into code.
3. **Inventory.** List every distinct block in the design: which are bespoke sections, which map to an existing section with restyling, which belong to the global layout or a record template.
4. **Build** each bespoke block with `designos-new-section`: props for all copy, media and options; defaults empty; semantic HTML. Keep the design's layout, motion and details in the component and stylesheet. Do not flatten it into a generic section.
5. **Content.** Move the design's copy into the CMS as drafts only if the owner approved it as real copy; prototype text is placeholder until confirmed. Never carry over invented claims.
6. **Assets.** Images from the design need licences and alt text; upload approved ones with `cms_upload_image`.

## 4. Check fidelity and editability

Screenshot the implementation beside the design at mobile and desktop. Then prove editability: in the composer, change copy, swap an image, reorder and remove sections, and confirm nothing breaks. Run `designos-audit` for accessibility and schema before review.
