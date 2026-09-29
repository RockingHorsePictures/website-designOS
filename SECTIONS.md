# Sections: the editable page structure

Pages are composed of **sections** that owners add, reorder, edit and remove in the page composer (`/editor/<page id>`) without code. Each section is a typed, validated content contract plus a React renderer.

## Bespoke first

The base library below exists so owners can keep building pages after launch. **It is not a template and should not steer a site's design.** A site's AI build designs what the brief deserves, then registers each distinctive block as its own section (for example `ServiceMatrix`, `ProcessTimeline`, `ShowreelHero`). It restyles or retires base sections as the design requires. The CMS structure stays the same; the look is the site's own.

## Base library

| Type               | Label                 | Purpose                                                                             |
| ------------------ | --------------------- | ----------------------------------------------------------------------------------- |
| `Hero`             | Hero                  | Opening statement, optional image and two actions; layouts stacked/split/background |
| `Intro`            | Introduction          | Heading and short paragraph (from 0.1)                                              |
| `Text`             | Text                  | Formatted text: paragraphs, subheadings, lists, links                               |
| `TextMedia`        | Text and image        | Text beside an image                                                                |
| `Media`            | Image                 | One image with caption                                                              |
| `Gallery`          | Gallery               | Several images                                                                      |
| `Video`            | Video                 | Vimeo/YouTube with transcript and VideoObject data                                  |
| `Features`         | Feature list          | Items in 2–4 columns with optional link/image                                       |
| `Stats`            | Figures               | Key figures, each linked to an Approved Fact                                        |
| `Quotes`           | Testimonials          | Attributed quotes, each linked to an Approved Fact                                  |
| `Logos`            | Client logos          | From Client records                                                                 |
| `FAQ`              | Questions and answers | Visible Q&A that can publish FAQPage data                                           |
| `SelectedProjects` | Selected case studies | Case Study records: latest, featured or chosen (from 0.1)                           |
| `Services`         | Services              | Service records: all or chosen                                                      |
| `Team`             | Team                  | Team Member records: all or chosen                                                  |
| `CallToAction`     | Call to action        | Prompt with one link (from 0.1)                                                     |
| `Contact`          | Contact               | Site Settings contact details and an enquiry form (stored under **Enquiries**)      |

`npm run sections -- catalog` prints every section's props as JSON schema. That output, not this table, is authoritative, and it includes bespoke sections once they are registered.

A page can hide its default header (title and summary) with the composer's **Page header → Hide** option; the first section must then be a Hero, whose heading becomes the page's `h1`.

## The contract

A section is defined in four places that a unit test (`tests/unit/registry.test.ts`) keeps in step:

1. `src/editor/registry/schema.ts`: `sectionSchemas.<Type>` (zod, strict) and `sectionMeta.<Type>` (label, category, description, empty defaults).
2. `src/editor/registry/config.tsx`: composer fields for every prop.
3. `src/components/sections/index.tsx` (or a file it imports): `sectionRenderers.<Type>`, plain React shared by the composer and the public site.
4. Data: sections that reference records read them from `SectionData`, which is resolved from the immutable site release by `src/components/site/Sections.tsx` and from the workspace by the editor page.

Rules:

- Props carry content and meaningful options only. No raw CSS, colours, pixel sizes or HTML.
- Copy and images are props. Records (case studies, services, people, clients) are referenced by ID, never copied.
- Links use `linkRef` (validated). Images use `mediaRef` (media ID, per-use alt, decorative). Long text uses the Markdown subset: blank line for a paragraph, `## ` subheading, `- ` list, `**bold**`, `[label](/path)`. It renders to React only, never raw HTML.
- Figures and testimonials link to Approved Facts. Structured data comes only from visible content.
- Defaults are empty. Validation rejects unknown sections and unknown props, so stored data stays trustworthy.

## Changing sections safely

Pages already store section props. Additive, optional props are safe. Renaming or removing props, changing a `type` or repurposing a prop requires a data migration for page compositions and their versions, plus compatibility tests. Use `/designos-new-section` in Claude Code, or follow its checklist in `.claude/skills/designos-new-section/SKILL.md`.
