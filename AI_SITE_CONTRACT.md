# AI Site Contract

The current project is the Design OS foundation from specification V5. **Do not begin Phase 4 without a new explicit instruction.** The public frontend is deliberately neutral test scaffolding.

## Preserve the architecture

Payload owns all editorial data. React components own rendering and responsive behaviour. Git owns code and schema changes. Content publishing must never require a deployment. One company, one CMS, one application.

1. Never hard-code replaceable copy, company claims or imagery into reusable components. Obtain it from CMS fields, global settings or persisted section props. Ordinary interface labels can be static.
2. Case studies, services, people and clients remain structured records. Page composition stores record IDs and query settings, never copied entity content.
3. Every editor-facing section has a stable ID, typed props, approved fields, defaults, validation, variants and renderer. Update `src/editor/registry/schema.ts`, `config.tsx` and the server renderer together. Unknown or malformed sections fail validation.
4. Components consume semantic tokens from `src/design-system/tokens.ts`. Typography, spacing, breakpoints and motion remain code-controlled. Current token defaults are neutral fixtures, not branding decisions.
5. Preserve saved data during redesigns. Keep section IDs and prop semantics compatible. Breaking schema/prop changes require a committed migration, data migration when relevant, compatibility tests and status-document updates.
6. Protect keyboard interaction, headings, link labels, contrast and reduced motion. Decorative images render empty alt text. Per-use alt overrides take precedence over asset descriptions.
7. Every public CMS read uses `overrideAccess: false` and published mode. Do not pass an authenticated editor to normal public reads. Draft reads require both a valid CMS session and enabled preview mode. Never serialize secrets or internal evidence into browser data.
8. Future AI-generated factual copy must cite approved, verified CMS facts or user-approved references. Do not invent projects, clients, outcomes, locations, awards or capabilities. Missing facts require user input. Suggestions never become verified facts automatically.
9. Runtime AI is optional, server-side and budget-limited. It returns suggestions; it cannot publish. Manual editing and uploads must continue when AI fails.
10. Code/design changes go through a feature branch, CI and a hosted preview backed by separate data. Never point preview credentials at production. Schema push is off by default.

## Starting a later design phase

After explicit authorization, inventory references and agree the sitemap, templates and visual direction. Design normal React components first, then expose their smallest useful editable API. Replace neutral proof renderers while retaining their content contracts or supply migrations. Use the existing authentication, collections, search helpers, preview routes, media and deployment wiring. Run unit, integration, browser and accessibility tests before review.
