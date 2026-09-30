---
name: designos-new-section
description: Create or change an editable page section in a Design OS site — a bespoke component that owners can then add, reorder and edit in the page composer without code. Use when implementing a design as CMS-editable sections, adding a variant, or changing section props safely.
---

# Add an editable section

Design first, then expose the smallest useful editable API. Read `docs/SECTIONS.md` for the full contract. A section is registered in **four places that must agree** (a unit test enforces this):

| Where                            | What                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/editor/registry/schema.ts`  | `sectionSchemas.<Type>` (zod props, `.strict()`) and `sectionMeta.<Type>` (label, category, description, empty defaults) |
| `src/editor/registry/config.tsx` | `sectionFields` entry: Puck fields for every prop (reuse `mediaField`, `link`, `idPicker`, `body`)                       |
| `src/components/sections/`       | the React renderer in `sectionRenderers.<Type>` (plain React, no async/server-only code)                                 |
| `tests/unit/registry.test.ts`    | covered automatically; add a case for any special validation                                                             |

## Steps

1. **Name and shape.** Choose a stable PascalCase `type` that describes purpose, not appearance (`ProcessSteps`, not `BlueCards`). Props hold content and meaningful options only (`layout`, `columns`), never raw CSS, colours or pixel sizes. Colours come from theme tokens (`var(--color-*)`), fonts from typography tokens; sizes, spacing and motion stay in code.
2. **Content rules.** Replaceable copy and imagery are props. Structured records (case studies, services, people, clients) are referenced by ID with a `mode` (`all`/`manual`), never copied. Links use `linkRef` (validated by `safeLink`). Images use `mediaRef` (media ID + per-use alt + decorative). Long text uses the Markdown subset (`<Markdown source=… />`). Figures and testimonials link to Approved Facts (`factId`).
3. **Defaults** are empty or neutral — never sample marketing copy.
4. **Renderer.** Semantic HTML, one heading level below the page (`h2`, items `h3`; `ctx.headingLevel` for a first Hero), visible focus, reduced-motion safe, images through `MediaImage`/`next/image` with `imageSrc`. Add styles in the site's stylesheet using the section's class names.
5. **Data.** If it needs a new record type, extend `SectionData`, `EditorData` (`src/app/(composer)/editor/[id]/page.tsx`) and `sectionData()` in `src/components/site/Sections.tsx`.
6. **Audits.** If it carries claims, links or media, check `src/lib/quality.ts` covers them; add structured data in `sectionSchemas()` of `src/lib/search/metadata.ts` only for visible content.
7. **Verify.** `npm run typecheck && npm run lint && npm test`, then open `/editor/<page id>`, add the section, save a draft and check `/workspace-preview/<slug>` at 390/768/1440px. Run `npm run sections -- catalog` to confirm it is listed for AI tools.

## Changing an existing section

Stored pages already use its props. Adding an optional prop with a default is safe **only** if old data still validates: make it `.optional()` or `.default()` in the schema and handle absence in the renderer. Renaming/removing props or changing a `type` needs a data migration for every page composition (and its versions), compatibility tests and a note in IMPLEMENTATION_STATUS.md. Never repurpose an existing prop's meaning.
