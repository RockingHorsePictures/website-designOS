# COMPANY WEBSITE + EDITING SYSTEM — IMPLEMENTATION SPEC

## 0. Instruction to the implementation agent

Read this document in full before changing or creating code.

### IMPORTANT SCOPE FOR THIS IMPLEMENTATION RUN

For the current implementation run, build the **website foundation / Design OS only**.

Complete:

- Phase 1
- Phase 2
- Phase 2B
- Phase 3

Then **STOP**.

Do **not** begin Phase 4 or any final visual design/build work for the company website unless the user gives a new, explicit instruction after reviewing the completed foundation.

The purpose of this implementation run is to create the infrastructure on top of which the bespoke company website will later be designed and built.

Any frontend created before Phase 4 must be deliberately minimal, neutral and utilitarian. It exists only to prove the CMS, editor, preview, publishing and deployment architecture works end-to-end. It must not be treated as a proposal for the final company website.

Do not make final decisions during Phases 1–3 about:

- visual identity;
- homepage design;
- typography;
- final colour palette;
- animation or motion language;
- final page layouts;
- final case-study layouts;
- portfolio browsing interaction;
- service-page presentation;
- team-page presentation;
- navigation design;
- creative transitions;
- final responsive art direction;
- bespoke visual components beyond those needed to prove the editor architecture.

At the end of Phase 3:

1. stop implementation;
2. update `IMPLEMENTATION_STATUS.md`;
3. confirm which parts of the Design OS are working;
4. list any architectural decisions that affect the later website design;
5. explain how a future AI design/coding agent should begin building the real website against this foundation;
6. wait for a new explicit instruction before proceeding.

If speculative final visual-design work has already been created, separate it from the foundation. Preserve infrastructure work, but remove or revert speculative visual design unless it is genuinely required as minimal test scaffolding.

Create and continuously maintain:

- `IMPLEMENTATION_STATUS.md` — current phase, completed work, decisions made, blockers, next actions.
- `ARCHITECTURE.md` — concise description of the implemented architecture and data flow.
- `EDITOR_GUIDE.md` — how a non-technical company user edits, previews and publishes the website.
- `AI_SITE_CONTRACT.md` — rules that future AI coding agents must follow when adding or modifying site components.
- `.env.example` — every required environment variable, with no secrets.
- `README.md` — local setup, development, testing and deployment instructions.

Do not build a generic commercial website builder. This system is for **one company website**. Prefer the simplest robust implementation that meets the requirements below.

The finished project must allow future AI coding agents to redesign and extend the bespoke website without destroying CMS editability.

---

# 1. Project objective

Build a bespoke company website from scratch using AI-assisted coding, while giving non-technical company users a friendly editing environment after launch.

The public website must not look or behave like a template-generated website. The frontend is a normal custom React/Next.js application and may use bespoke layouts, typography, animation, transitions, video, WebGL or other creative techniques where appropriate.

The editing system exists alongside that bespoke frontend. It must allow users to:

1. Edit website copy.
2. Replace and manage images.
3. Manage video references/posters where used.
4. Create, edit, duplicate, draft, publish and unpublish case studies.
5. Create, edit, duplicate, draft, publish and unpublish service pages.
6. Add, edit, reorder and remove team members.
7. Manage global navigation and footer content.
8. Manage common company/contact information.
9. Change approved brand/theme colours through design tokens.
10. Preview unpublished changes.
11. Preview the site at desktop, tablet and mobile widths.
12. Compose selected marketing pages from an approved library of bespoke page sections.
13. Publish content without requiring a code deployment.
14. Retain the ability for a coding agent to make deeper design/code changes through Git and normal deployment.

The system must clearly distinguish **content editing** from **code/design development**.

It must also clearly distinguish the **foundation/Design OS build** from the later **bespoke website design/build**. The foundation is implemented first and reviewed before final visual design begins.

---

# 2. Core architectural decision

Use one TypeScript/Next.js codebase containing:

- the public website;
- Payload CMS;
- the company editing/admin experience;
- an optional/limited Puck visual composition layer;
- the bespoke design system and site components.

Recommended core stack:

- **Next.js**
- **React**
- **TypeScript**
- **Payload CMS**
- **PostgreSQL**
- **Puck** for constrained visual composition of selected pages/sections
- CSS architecture chosen by the implementation agent, provided it supports design tokens cleanly
- Git + GitHub for source control
- Vercel for the simplest default production deployment
- Managed PostgreSQL such as Neon for production data
- Vercel Blob, S3-compatible storage or equivalent persistent object storage for uploaded media

Do not introduce a second CMS.

Do not use Puck as the database of record for structured company content.

Payload is the source of truth for website content.

---

# 3. Development versus production

## Local development

The entire application must run locally for development.

A developer or coding agent should be able to:

1. clone the repository;
2. install dependencies;
3. configure local environment variables;
4. run the development server;
5. access both the public website and `/admin`;
6. work on website components and CMS schemas in the same repository.

A local development database may be used, but the implementation should make it easy to use a development/staging cloud database if preferred.

## Production

Production is not purely local.

The live system requires persistent hosting for:

- the Next.js application;
- the Payload admin/API;
- PostgreSQL;
- uploaded media.

Default production topology:

```text
GitHub
   │
   │ push / pull request
   ▼
Vercel
   ├── Public Next.js website
   ├── Payload API
   └── /admin editing interface
          │
          ├────────► Managed PostgreSQL
          │
          └────────► Persistent object storage
```

The public website and CMS/admin may share the same deployment and domain.

Example:

- `www.company.com` — public website
- `www.company.com/admin` — authenticated editor

If there is a compelling implementation reason to separate admin and public domains, document it before doing so. The default is a single application.

---

# 4. Publishing model

There are two distinct publishing paths.

## 4.1 Content publishing

For copy, imagery, cases, services, people and other CMS content:

```text
Editor → Payload → Preview/Draft → Publish → Live website
```

No Git commit or application redeployment should normally be required.

Use appropriate Next.js/Payload revalidation so published changes become visible promptly.

## 4.2 Code/design publishing

For new components, structural redesigns, animation changes, functionality or CMS schema changes:

```text
AI coding agent / developer
        ↓
      Git
        ↓
 tests / preview deployment
        ↓
 production deployment
```

This separation is fundamental to the system.

---

# 4.3 Pre-publish Quality Assurance

Before a user publishes important indexable content, provide a unified quality check.

The check should be advisory unless an issue would make the page technically invalid, unsafe or clearly broken.

Check where relevant:

### Content / factual integrity
- required fields;
- unresolved placeholders;
- unsupported factual claims;
- AI-generated claims that are not backed by approved facts/reference sources;
- missing relationships that appear material.

### Accessibility
- meaningful images missing alt text;
- decorative-image status;
- heading hierarchy;
- obvious link-label issues;
- media accessibility requirements that apply.

### Search / discoverability
- title and description;
- canonical;
- index/noindex;
- schema validity/completeness;
- sitemap eligibility;
- broken/internal links;
- orphan-risk / missing relevant relationships;
- redirect requirements after slug changes.

### Technical
- broken URLs;
- invalid component configuration;
- missing required media;
- preview rendering errors.

Present results as:

- blockers;
- warnings;
- recommendations.

Do not reduce this to a single opaque SEO score.

Allow authorised users to publish with non-blocking recommendations unresolved.

# 5. Content model

Implement the following Payload collections/globals. Adjust individual fields as the website design develops, but preserve the conceptual separation.

## 5.1 Pages

Purpose: general marketing/content pages that are not better represented by a dedicated collection.

Fields should include:

- title
- slug
- status/draft state
- SEO metadata
- social/share metadata where useful
- page composition/layout
- optional theme override
- optional navigation settings
- publication metadata

Examples:

- Home
- About
- Contact
- general campaign/landing pages

`Pages` may use the approved section/component library for flexible composition.

## 5.2 Case Studies

A first-class collection. Do not model case studies as generic Pages.

Initial fields should support:

- title
- slug
- client
- short summary
- long-form/project narrative
- service/category relationships
- project year/date
- hero media
- thumbnail/card media
- hero video or video reference where relevant
- gallery/media sections
- credits
- related case studies
- project metadata
- optional awards/results
- SEO
- draft/publish state
- manual ordering / featured status where required

Design this so a non-technical editor can create a new case study without code.

The frontend route should be generated automatically from the collection.

## 5.3 Services

A first-class collection.

Fields should support:

- title
- slug
- short description
- full description
- hero content
- associated imagery/video
- capabilities / sub-services
- selected case studies
- optional related services
- SEO
- draft/publish state
- ordering / navigation controls

The frontend route should be generated automatically.

## 5.4 Team Members

A first-class collection.

Fields:

- name
- role/job title
- portrait/headshot
- optional hover/alternate image
- short bio
- optional long bio
- optional social/profile links
- ordering
- active/inactive state

Team page layouts must adapt automatically as records are added, removed or reordered.

Never require code changes simply because the number of team members changes.

## 5.5 Media

Use Payload's media/upload functionality.

Support at minimum:

- images
- alt text
- captions where required
- focal point / crop metadata where appropriate
- image dimensions and generated responsive sizes
- poster images
- metadata useful to editors

Large source/master video files should not automatically be stored in the CMS unless there is a strong reason. Prefer references/embeds to the company's chosen video platform for streamed video.

## 5.6 Navigation

Either a collection or global, whichever produces the simplest editing experience.

Editors must be able to manage:

- primary navigation
- secondary navigation if used
- footer navigation
- internal/external links
- ordering

## 5.7 Site Settings

Payload global containing information such as:

- company name
- primary contact details
- social links
- default SEO information
- default share image
- footer data
- legal links
- analytics/configuration identifiers where appropriate

Do not expose secrets in CMS fields.

## 5.8 Approved Facts / Evidence Library

Create a first-class structured source of truth for facts that AI features are permitted to use when writing or rewriting company content.

This exists specifically to prevent AI-generated marketing/search content from inventing plausible but unsupported claims.

Records may include:

- company facts;
- official company descriptions;
- capabilities;
- office/location facts;
- years/dates;
- awards and accreditations;
- approved client relationships;
- project facts;
- performance/results/statistics;
- testimonials/quotes;
- sustainability or compliance claims;
- technology/capability claims;
- approved differentiators;
- other factual statements the company wants AI to be able to rely upon.

Each fact should support, where useful:

- statement/value;
- category;
- related client/project/service;
- source/evidence note;
- source URL/reference;
- verification status;
- date verified;
- optional expiry/review date;
- internal notes.

### Factual-integrity rules for all AI features

All runtime AI functionality and all future AI coding/content workflows must follow these rules:

1. Never invent company facts, client relationships, project details, results, awards, statistics, locations, capabilities or other factual claims.
2. Prefer information from the Approved Facts / Evidence Library and structured CMS records.
3. Information may also be taken from reference material explicitly supplied by the user, including an approved reference URL such as the existing company website.
4. If important information is missing, ask the user rather than filling the gap with a plausible assumption.
5. Clearly distinguish confirmed facts from AI suggestions or inferred strategy.
6. Never convert an inference into an approved fact automatically.
7. Where reference sources conflict, flag the conflict for user review.
8. AI-generated drafts may reorganise, shorten or rewrite approved facts, but must preserve their meaning.
9. Claims that materially change meaning or strength require explicit user approval.

The Search Assistant should be able to cite the internal source/evidence behind a recommendation or generated factual statement where practical.

## 5.9 Relational taxonomy / entity model

Avoid treating the website as a set of disconnected text pages.

Use structured relationships so the site and AI systems understand how content relates.

At minimum support relationships between:

- Case Studies ↔ Clients
- Case Studies ↔ Services
- Case Studies ↔ Capabilities, where capabilities are distinct from Services
- Case Studies ↔ Sectors/Industries where relevant
- Case Studies ↔ Team Members/credits where useful
- Services ↔ related Case Studies
- Services ↔ related Services
- Pages ↔ relevant Services/Case Studies where intentionally curated

Create dedicated lightweight collections/taxonomies such as `Clients`, `Capabilities` and `Sectors` only if they provide genuine value to the company website.

Do not create taxonomy purely for SEO keyword stuffing.

Relationships should power:

- related-content modules;
- internal linking;
- service/capability landing pages;
- filters where useful;
- schema/entity generation;
- Search Assistant recommendations;
- content-gap analysis.

## 5.10 Theme / Design Tokens

Use a deliberately constrained set of editable design tokens.

At minimum consider:

- page/background
- surface
- primary text
- muted text
- brand/accent
- highlight
- border
- inverse text
- optional secondary brand colour

Do not expose arbitrary CSS values for every component.

The editor should manipulate semantic tokens; components consume those tokens.

Typography, spacing, grids, breakpoints and animation primitives should remain code-controlled initially unless a genuine editing requirement emerges.

---

# 6. Editing philosophy

The editor must make common changes easy while protecting the quality of the design.

## Editors SHOULD be able to

- change copy;
- replace media;
- add/remove/reorder records;
- create new case studies;
- create new service pages;
- manage team members;
- manage approved page sections;
- select from approved variants;
- alter approved theme tokens;
- preview changes;
- save drafts;
- publish.

## Editors SHOULD NOT initially be able to

- type arbitrary CSS;
- set arbitrary margins/padding per element;
- choose arbitrary typefaces;
- choose arbitrary responsive breakpoints;
- inject arbitrary scripts;
- freely reposition every element on a canvas;
- override every colour independently;
- edit low-level animation code.

The goal is a **designed editing system**, not unrestricted page-builder freedom.

---

# 7. Visual page composition with Puck

Use Puck selectively.

Puck is appropriate for flexible pages such as:

- homepage;
- about;
- contact;
- general landing pages;
- other marketing pages that benefit from arranging approved sections.

Puck is not the source of truth for Case Studies, Services or Team Members.

## Puck component library

Register bespoke site sections/components such as:

- Hero
- Intro
- Rich Text
- Media
- Full-bleed Video
- Image Grid
- Project Grid
- Selected Case Studies
- Service List
- Team Preview
- Logo/Client Strip
- Quote/Testimonial
- Statistics
- CTA
- Spacer only if truly necessary
- any new bespoke modules created during site design

The component list above is illustrative, not a mandate to make the eventual site generic.

The website design phase may create very specific, unconventional components. Those components should still expose deliberate editable properties.

Puck should be styled/customised so the editing experience feels appropriate for this company rather than like an off-the-shelf website builder.

---

# 8. The AI Site Contract

Create `AI_SITE_CONTRACT.md` and enforce these rules for every site component.

## 8.1 No hard-coded editorial content

Do not hard-code normal user-facing editorial copy or replaceable imagery inside reusable site components.

Content should come from:

- Payload fields;
- component props ultimately stored via Payload;
- global site settings;
- deliberate static UI labels where they are truly interface copy rather than editorial content.

## 8.2 Every editor-facing component defines its editable API

A component intended for use in the visual editor must define:

- its component name/id;
- editable fields;
- field types;
- default values where appropriate;
- validation constraints;
- allowed variants;
- optional visibility controls where appropriate;
- renderer.

The actual implementation may use a shared TypeScript helper/schema to avoid duplication between Puck configuration and other metadata.

## 8.3 Structured data must remain structured

Do not duplicate case-study, service or team-member data as freeform page-builder JSON.

Page sections that display those entities should reference/query Payload records.

For example:

`SelectedCaseStudies` should store selected case-study IDs or a query mode, not copies of their titles/images/descriptions.

## 8.4 Design tokens

Site components must consume semantic design tokens rather than hard-coded brand colours wherever practical.

## 8.5 Responsive behaviour belongs to code

Editors may preview breakpoints but should not normally create separate arbitrary mobile/tablet layouts.

Components must contain carefully designed responsive behaviour.

Expose responsive options only where they are intentionally part of the design system.

## 8.6 Backwards compatibility

When an AI agent modifies an existing component, existing saved CMS/page data must remain valid wherever reasonably possible.

If a breaking content/schema migration is unavoidable:

- create an explicit migration;
- document it;
- test existing content;
- update `IMPLEMENTATION_STATUS.md`.

## 8.7 Accessibility

Every new component must preserve keyboard accessibility, semantic structure and reduced-motion behaviour where relevant.

## 8.8 Component contract validation

Create automated checks where practical so a malformed/unknown page-builder component or invalid configuration fails in development/CI rather than silently breaking production.

---

# 9. Editing UI

The initial release may use Payload's admin UI as the primary shell, with custom views/components added where they materially improve usability.

Aim for the following experience.

## Main areas

- Dashboard
- Pages
- Case Studies
- Services
- Team
- Media
- Navigation
- Site Settings
- Theme
- Users

## For page editing

Provide:

- page/section outline;
- section add/remove/reorder controls;
- editable field panel;
- rendered preview;
- desktop/tablet/mobile preview modes;
- save draft;
- publish;
- clear indication of unpublished changes.

Where practical, clicking/selecting a section in the preview should make the relevant fields easy to locate.

Do not spend excessive time recreating a complete visual-editor chrome if Payload + Puck already provide the required functionality.

---

# 10. Responsive preview

Implement defined preview widths for at least:

- Desktop
- Tablet
- Mobile

The preview must render the real application components, not a simplified mock representation.

Preview widths should be configurable constants.

The site itself must remain fluid/responsive between those preset preview widths.

---

# 11. Drafts, preview, versions and publishing

Enable Payload functionality appropriate to editorial use, including:

- drafts;
- preview;
- versions/history where practical;
- published/unpublished states;
- scheduled publish and scheduled unpublish for content types where useful.

The site must support securely previewing unpublished content.

Do not expose draft content to normal public requests.

Document how content rollback/version recovery works.

---

# 12. Authentication and roles

At minimum implement authenticated CMS users.

If role support is simple to implement cleanly, provide:

### Administrator
- full CMS control
- users
- settings
- publish

### Editor
- manage normal content
- media
- drafts
- publish if company workflow permits

Do not overbuild enterprise permission systems for the initial site.

Protect `/admin` and all mutation endpoints appropriately.

---

# 13. Media handling

Implement reliable image handling.

Requirements:

- persistent object storage in production;
- responsive image delivery;
- context-aware automatic alt-text generation;
- editable alt text with human override;
- decorative-image handling using empty alt text where appropriate;
- appropriate modern formats where supported;
- width/height metadata to reduce layout shift;
- focal point/cropping support where useful;
- lazy-loading below the fold;
- ability to replace images without code.

## 13.1 Automatic alt-text workflow

Automatic alt text is a first-class CMS feature, not an optional afterthought.

When an image is uploaded or assigned to a page/component, the system should be capable of generating an appropriate alt-text draft automatically using both:

1. the visual content of the image; and
2. the context in which the image is being used.

Context may include:

- page title;
- case-study title/client;
- service name;
- nearby heading/copy;
- image caption;
- media purpose/role;
- relevant company/project information from Payload.

This is important because useful alt text describes the image's purpose in context rather than merely describing pixels.

### Required behaviour

- generate an alt-text suggestion automatically for new editorial images where appropriate;
- make the suggestion immediately editable;
- preserve a deliberate human override;
- never silently replace manually edited alt text unless the user explicitly requests regeneration;
- provide a `Regenerate alt text` action;
- provide a `Mark as decorative` control;
- decorative images must render with `alt=""` rather than AI-generated prose;
- support a `Needs review` state when the AI is uncertain or lacks enough context;
- flag meaningful images that are missing alt text before publish;
- do not block publishing for intentionally decorative images;
- optionally bulk-generate missing alt text for an imported/legacy media library;
- preserve alt text when the same Media record is reused where the description is genuinely asset-level;
- support per-usage alt-text overrides where the same image has a materially different purpose on different pages.

### Alt-text generation rules

The AI must:

- prioritise accessibility and useful context over keyword insertion;
- be concise;
- describe meaningful information not already obvious from adjacent text;
- avoid starting every description with "Image of" or "Photo of";
- avoid guessing identities, client facts, locations, emotions, demographics or other details that are not known;
- use confirmed CMS/project context when relevant;
- avoid stuffing service names, locations or search terms;
- avoid including photographer/credit information unless it is relevant to understanding the image;
- identify when an image is decorative and recommend empty alt text;
- treat logos, diagrams, screenshots, charts and text-bearing images according to their functional purpose rather than applying generic photo-description rules.

SEO/AEO/GEO considerations must never override accessibility correctness.

### Generation timing

Support generation at sensible points such as:

- immediately after upload;
- when an image is first assigned to an indexable page;
- on explicit regeneration;
- during a site/media audit;
- during legacy-site migration.

Where context materially affects the description, prefer generating or refining the alt text when the asset is assigned to a page rather than relying only on upload-time visual analysis.

### AI/provider architecture

Use the same server-side AI provider abstraction as the Search Assistant where practical.

Alt-text generation must:

- keep API/model credentials server-side;
- degrade gracefully if AI is unavailable;
- allow manual alt text at all times;
- avoid making media upload dependent on successful AI generation;
- record whether text is AI-generated, manually edited, or intentionally decorative where useful.

For video:

- Vimeo is the expected primary video host for version 1;
- store Vimeo IDs/URLs and the minimum structured metadata required by the site;
- do not upload video masters into Payload;
- support poster/thumbnail media from Payload where useful;
- lazy-load Vimeo players where possible;
- preserve autoplay/mute/accessibility/browser constraints;
- keep the integration replaceable rather than scattering Vimeo-specific parsing logic throughout components.

Automatic transcription/caption generation and a full video-asset workflow are explicitly deferred for version 1 unless a concrete requirement emerges.

The CMS may still store editorial descriptions and schema-relevant video metadata where useful, but do not build a transcription platform.

---

# 14. Search, SEO, AEO and Generative-Search Foundations

Search discoverability is a core reason for rebuilding the website and must influence architecture from the beginning rather than being added after visual design is finished.

Treat SEO, answer-engine visibility and generative-search visibility as one **Search & AI Discoverability** discipline built on:

- technically crawlable/indexable pages;
- strong semantic HTML;
- useful visible textual content;
- clear entity and topic definition;
- accurate structured data;
- intentional site architecture and internal linking;
- strong page experience and performance;
- original, expert-led content;
- measurable search performance.

Do not implement speculative "GEO hacks" as core infrastructure.

In particular, do not assume that `llms.txt`, arbitrary AI-specific markup, hidden "AI summaries", content chunking tricks, keyword stuffing or mass-generated pages improve visibility.

The system should make it easy to adopt genuinely useful new standards later without coupling the site to unproven tactics.

## 14.1 Search Strategy / Company Search Profile

Create a structured CMS global or collection representing the company's search/content strategy.

This should be editable and initially populated during onboarding/research.

Suggested fields:

- concise company description;
- full company proposition;
- services/capabilities;
- target audiences;
- priority industries/sectors;
- priority geographic markets;
- differentiators;
- client types;
- common customer problems/questions;
- business/search objectives;
- priority topics;
- target search intents/themes;
- brand tone of voice;
- important company facts that AI must preserve accurately;
- approved terminology;
- terms/claims that should not be used;
- important entities and relationships;
- official organization name;
- alternate/trading names if applicable;
- social/profile URLs (`sameAs` candidates);
- office/location information where genuinely relevant;
- competitors/reference companies as optional research inputs;
- notes from search/content research.

This profile serves as context for the site's AI search assistant.

Editors must be able to review and correct it. AI-inferred information must never silently become an authoritative company fact.

## 14.2 Per-page Search panel

Pages, Case Studies, Services and any future indexable content types should expose a consistent Search/SEO panel.

Provide sensible automatic defaults so editors do not need to fill every field manually.

Support where relevant:

- search title / HTML title;
- meta description;
- canonical URL;
- index/noindex;
- follow/nofollow only where a real use case exists;
- social title;
- social description;
- social image;
- primary topic;
- search intent;
- optional priority query/theme;
- key questions the page answers;
- optional content summary for editorial planning;
- structured-data preview/status;
- internal-link suggestions/status;
- redirect history if slug changes;
- last substantive update date where useful.

Do not expose raw technical controls to normal editors when an automatic implementation is safer.

## 14.3 Structured data / Schema.org

Create a typed structured-data layer generated from real CMS content and visible page content.

Prefer generated schemas over manually maintained JSON-LD.

At minimum implement appropriate support for:

- `Organization`;
- `WebSite`;
- `BreadcrumbList`;
- `Service`;
- `Person` / `ProfilePage` if individual profile pages exist;
- `VideoObject` for indexable video content where appropriate;
- `ImageObject` where useful;
- `Article` only for genuinely editorial/article content;
- `LocalBusiness` only if the company genuinely qualifies and location intent is relevant;
- other Schema.org types only where they truthfully describe the visible content.

Case studies should use the most semantically appropriate supported Schema.org structure based on their final content rather than inventing a `CaseStudy` type.

Requirements:

- JSON-LD must be valid;
- structured data must match visible content;
- shared company/entity data should come from Site Settings/Search Profile rather than being repeatedly entered;
- editors modify normal CMS fields, not JSON-LD, in ordinary use;
- provide developer/admin validation and a rendered-schema preview;
- allow a carefully controlled advanced override only if a real need emerges;
- schema changes must be testable.

Do not promise rich results merely because structured data is present.

## 14.4 Technical search foundations

Implement and test:

- server-rendered/indexable important content;
- semantic page structure;
- one clear primary heading hierarchy;
- descriptive internal links;
- clean stable URLs;
- canonical handling;
- automatic XML sitemap generation;
- accurate `lastmod` values where appropriate;
- `robots.txt`;
- noindex protection for preview/staging/admin URLs;
- correct HTTP status codes;
- redirect management for changed/legacy URLs;
- custom 404 handling;
- Open Graph/social metadata;
- image discoverability;
- video discoverability where applicable;
- Core Web Vitals-conscious implementation;
- mobile-first responsive rendering;
- breadcrumb UI/data where appropriate;
- Search Console verification hooks;
- Bing Webmaster Tools verification hooks;
- IndexNow submission on relevant publish/update/delete events;
- crawler access controls that distinguish normal search discovery from model-training preferences where providers support that distinction.

Do not accidentally block legitimate search/AI-search crawlers through CDN/WAF/bot-protection defaults.

Crawler policy must be documented in `EDITOR_GUIDE.md` or an operations document.

## 14.5 Search-friendly treatment of a visual production website

This company website is expected to be visually and video led. Search visibility must not depend solely on media that crawlers/AI systems cannot fully interpret.

Case studies and service pages should contain useful visible textual context.

Depending on the project, this can include:

- client/context;
- challenge or brief;
- what the company delivered;
- services/capabilities used;
- creative/technical approach;
- relevant production details;
- results/outcomes where substantiated;
- credits where useful;
- selected quotes/testimonials where genuine;
- captions/context around important imagery/video;
- accessible transcripts or meaningful video descriptions where useful.

Do not add invisible keyword blocks or text written solely for crawlers.

The final content should still read as a premium creative-company website.

## 14.6 AI Search Assistant

Build the architecture for an optional AI-assisted Search & Content workspace inside the admin.

This can be implemented incrementally, but the CMS data model and interfaces should anticipate it.

The assistant should be capable of operating at two levels:

### Page-level assistant

For the current page, it may:

- audit whether the page clearly communicates its topic/intent;
- suggest improved title and meta description;
- suggest heading improvements;
- propose copy improvements while preserving brand voice;
- identify missing useful information;
- identify unclear entities/names;
- suggest internal links;
- suggest related case studies/services;
- suggest genuinely useful questions/answers;
- generate or regenerate context-aware alt text and identify images that should instead be marked decorative;
- check structured-data completeness;
- flag weak/duplicate metadata;
- suggest a search-focused content brief;
- explain the reasoning behind recommendations.

AI changes must be suggestions/drafts.

Provide review/diff/accept/reject controls where feasible.

Never overwrite published copy silently.

### Site-level assistant

It may:

- crawl/audit the current build;
- inventory existing pages and topics;
- detect orphaned or weakly linked pages;
- detect duplicate/missing titles and descriptions;
- identify thin or unclear pages;
- identify missing service/topic coverage;
- suggest new pages or content;
- suggest improvements to site architecture;
- identify content overlap/cannibalisation risks;
- identify internal-link opportunities;
- audit schema coverage;
- audit indexability/canonical/redirect issues;
- audit image/alt-text coverage, including missing text, low-quality/generic descriptions, decorative-image misuse and images whose alt text does not match their page context;
- audit visible textual support for media-heavy pages;
- create prioritised recommendations.

Recommendations should include:

- issue/opportunity;
- affected URL(s);
- why it matters;
- evidence;
- suggested action;
- expected objective;
- confidence/priority;
- status (open/accepted/dismissed/completed).

Avoid a single opaque "SEO score" as the primary decision mechanism.

## 14.7 Website/legacy-site onboarding and audit

Support an onboarding workflow where the user may provide:

- the current/old website URL;
- a description of the business;
- target audiences;
- target sectors;
- priority locations;
- key services;
- important competitors/reference sites;
- known priority search terms/topics;
- business goals.

If an old-site URL is supplied, an AI/crawler-assisted import/audit process may:

1. crawl publicly accessible pages;
2. build a page/content inventory;
3. extract current company facts, services, case studies, people and metadata;
4. identify redirect requirements;
5. identify potentially valuable existing URLs/content;
6. infer an initial Search Strategy profile;
7. identify obvious content gaps.

AI-inferred business facts must be shown to the user for confirmation rather than automatically treated as true.

Do not blindly copy old content merely because it exists.

Preserve useful existing URLs or implement appropriate redirects where they carry search value.

## 14.8 Research functionality

The Search Assistant should be designed so external research can be added without rewriting the CMS.

Define provider interfaces for:

- search-performance data;
- site crawl data;
- keyword/query/topic research;
- public-web research;
- page-performance data;
- AI/LLM provider.

Initial integrations should prioritize first-party/measurable data.

Recommended future/optional sources:

- Google Search Console;
- Bing Webmaster Tools;
- site analytics;
- PageSpeed Insights / Lighthouse;
- public web search/research provider;
- selected rank/keyword provider only if the company decides it is worth paying for.

Google Search Console integration is particularly valuable because it can supply real query/page/impression/click/position data after launch.

Do not make an expensive third-party SEO data subscription mandatory for the website to function.

## 14.9 AI provider architecture

Runtime AI features inside `/admin` are separate from whichever coding agent/model built the website.

Create a provider abstraction rather than deeply coupling the site to a single model vendor.

The assistant should be able to use a configured API-backed model provider.

Requirements:

- no model API keys in client-side code;
- secrets stored only in environment/secret management;
- explicit cost controls;
- rate limits;
- logging sufficient to diagnose failures without unnecessarily retaining sensitive prompts/content;
- optional model selection/configuration;
- functionality degrades gracefully when AI is disabled/unconfigured.

Do not assume a consumer ChatGPT/Claude subscription can power production CMS AI features. Runtime AI features normally require an appropriate API/integration.

## 14.10 AI content safety and quality controls

The Search Assistant must optimize for usefulness and accuracy, not simply search volume.

Rules:

- never fabricate client names, results, awards, capabilities or statistics;
- distinguish known facts from suggestions/inferences;
- never auto-publish newly generated search pages;
- avoid mass-produced near-duplicate location/service pages;
- avoid keyword stuffing;
- avoid hidden content;
- preserve company voice;
- prefer expert/company-specific information over generic filler;
- identify where human subject-matter input would make a page meaningfully stronger;
- cite/reference research evidence in recommendations where the research provider supports it;
- keep an audit trail of accepted AI-generated content changes where practical.

## 14.11 Search monitoring after launch

Create a Search workspace/dashboard or a clean extension point for one.

Eventually it should be able to surface:

- Search Console clicks;
- impressions;
- CTR;
- average position;
- top/declining queries;
- top/declining pages;
- new query opportunities;
- indexing issues;
- sitemap status;
- Core Web Vitals/performance issues;
- content recommendations based on actual performance;
- tracked referrals from relevant AI/search systems where analytics data exposes them.

Do not build a large analytics product before launch.

Phase the dashboard after the core site and publishing system are stable.

## 14.12 AI-search crawler policy

The project should deliberately configure and document crawler access.

For providers that distinguish search/discovery crawling from model-training crawling, keep those decisions separate.

For example, search/discovery access may be permitted while training access follows the company's chosen policy.

Do not hard-code a policy without documenting it and making it easy to change later.

---

# 15. Performance requirements

The fact that the site is creatively ambitious must not justify avoidable performance problems.

Use:

- appropriate server rendering/static generation/revalidation;
- optimised image delivery;
- code splitting;
- lazy loading for heavy media/animation;
- sensible font loading;
- minimal unnecessary client-side JavaScript.

Establish performance budgets after the initial design direction is known.

Do not prematurely constrain creative design solely to optimise synthetic benchmark scores, but identify and fix avoidable regressions.

---

# 16. Accessibility requirements

Target WCAG 2.2 AA for normal site content and interaction wherever practical.

At minimum:

- semantic HTML;
- keyboard navigation;
- visible focus states;
- sensible heading hierarchy;
- sufficient contrast;
- alt text workflows;
- reduced-motion support;
- captions/transcripts hooks for video where required;
- accessible forms;
- accessible navigation/menu behaviour.

Automate obvious checks in development/CI.

---

# 17. Forms

If the site has enquiry/contact forms:

- validate server-side;
- implement spam protection;
- do not expose secrets to the client;
- provide success/error states;
- store or route submissions according to the company's eventual workflow;
- keep the form integration replaceable.

Do not choose a CRM or email integration unless required by the website brief.

---

# 17.1 Preview architecture

The system must support two distinct preview workflows.

## A. Content/draft preview

Used when an editor changes CMS content but does not want the public website to change yet.

Workflow:

```text
Live website remains published version
        │
        └── Editor saves draft in Payload
                    │
                    ▼
          authenticated Draft Preview
                    │
                    ▼
             real frontend components
```

Requirements:

- editor can save drafts without publishing;
- Payload Admin exposes Preview / Live Preview;
- preview renders the real frontend;
- unpublished content is visible only through authenticated/secure draft preview;
- public visitors and search crawlers continue to receive the last published version;
- desktop/tablet/mobile preview modes remain available;
- where useful, provide a secure shareable preview-link mechanism later, but do not make this a launch blocker.

## B. Code/design preview

Used when a coding agent/developer changes React components, CSS, animations, schemas or other application code.

Workflow:

```text
AI coding agent / developer
        │
        ▼
Git feature branch / pull request
        │
        ▼
Vercel Preview Deployment
        │
        ├── unique preview URL
        └── staging data/environment
                │
                ▼
          team review / QA
                │
         approve + merge
                ▼
        Production deployment
```

Requirements:

- production must not change simply because a branch is pushed;
- each significant branch/PR should be preview-deployable;
- preview deployments should use staging/non-production secrets and data by default;
- schema-changing previews must never mutate the production database;
- preview URLs must be protected from indexing;
- only merging/approving the production branch should trigger production code deployment.

These two systems solve different problems and must not be conflated.

# 18. Environments

Support:

## Local
Developer/AI work.

## Preview/Staging
Every significant branch/pull request should be capable of producing a preview deployment.

Use separate staging/non-production environment variables and, by default:

- staging PostgreSQL database;
- staging media/object storage or safe read-only equivalents;
- non-production AI/search credentials where relevant.

Preview must not accidentally index in search engines.

Provide a documented way to seed/synchronise representative content into staging without turning production into the test database.

## Production
Public website and production CMS/data.

Prevent preview/dev environments from writing to production data by default.

---

# 18.1 What is hosted where

The implementation must document this clearly for non-technical stakeholders.

The default topology is:

```text
                        GitHub
               source code / schemas
                         │
              ┌──────────┴──────────┐
              │                     │
        Preview branches          main
              │                     │
              ▼                     ▼
       Vercel Preview           Vercel Production
       unique URLs              company website
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                    `/admin`                 public pages
                         │                         │
                         └────────────┬────────────┘
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                   PostgreSQL               Object storage
                  CMS/content              uploaded images

                    Vimeo remains external
                    for hosted video content
```

### GitHub stores

- application source code;
- React components;
- CMS collection/schema definitions;
- design system;
- editor configuration;
- migrations;
- tests;
- infrastructure/deployment configuration.

GitHub is not the CMS content database.

### Vercel runs

- the public Next.js website;
- the Payload API;
- the Payload admin interface;
- server-side preview logic;
- application/server functions.

Normal company editors do not need Vercel access to edit website content.

### PostgreSQL stores

- pages;
- case studies;
- services;
- people;
- relationships/taxonomies;
- drafts and versions;
- navigation/settings;
- Search Profile;
- Approved Facts / Evidence Library;
- Puck/page-composition data;
- other CMS records.

### Object storage stores

- uploaded website images and other CMS-managed files.

### Vimeo stores

- hosted video assets.

The website stores references/IDs required to render those videos.

### How users work

Non-technical company users open:

`https://company-domain.com/admin`

in a normal browser.

They do not clone the repository or run anything locally.

Coding agents/developers work against the GitHub repository, typically in a local or cloud coding environment. They run the full app locally when developing and push changes through Git branches/preview deployments.

The "editing structure" is therefore not a separate service that users install or host. It is the Payload admin/editor built into the deployed company website application.

# 19. Deployment recommendation

Default implementation:

### Application
Vercel

### Database
Managed PostgreSQL, preferably Neon unless another provider is intentionally chosen.

### Media
Vercel Blob or S3-compatible persistent storage.

### Source
GitHub.

### Domain/DNS
Use the company's existing provider. Do not couple application architecture to one DNS provider.

This is a default, not a hard requirement. If the implementation agent has a strong technical reason to choose an equivalent host, document the trade-off before switching.

---

# 20. Backups and recovery

Before launch, document and validate:

- database backup strategy;
- media backup/retention strategy;
- CMS content recovery;
- deployment rollback;
- database migration rollback/forward-fix approach.

Do not consider the site production-ready without a recovery plan.

---

# 21. Testing

Implement a pragmatic automated test suite.

At minimum test:

## Unit/schema tests
- important content validation;
- component mapping;
- design token logic;
- utility functions.

## Integration tests
- Payload collection access;
- page rendering from CMS data;
- draft/published behaviour;
- essential APIs.

## End-to-end smoke tests
Using Playwright or equivalent:

- homepage loads;
- main navigation works;
- case-study index/detail works;
- services index/detail works;
- an editor can authenticate;
- a representative content edit can be saved;
- preview works;
- published content appears correctly.

Add visual regression testing only if it proves valuable; do not make it a Phase 1 blocker.

---

# 22. Code quality

Requirements:

- strict TypeScript;
- sensible linting/formatting;
- no secrets in source;
- minimal dependency count;
- no abandoned/deprecated package choices without justification;
- reusable components without premature abstraction;
- clear server/client boundaries;
- database migrations committed to source control;
- comments for non-obvious implementation decisions, not commentary on obvious code.

Prefer boring, maintainable infrastructure around a creatively ambitious frontend.

---

# 23. Initial project structure

The implementation agent may refine this, but aim for clear separation such as:

```text
src/
  app/
    (frontend)/
    (payload)/
  cms/
    collections/
    globals/
    fields/
    hooks/
    access/
  components/
    ui/
    sections/
    site/
  editor/
    puck/
    registry/
    fields/
    preview/
  design-system/
    tokens/
    typography/
    layout/
    motion/
  lib/
  styles/
payload.config.ts
```

Do not force this exact tree if Payload's current recommended structure suggests a better arrangement.

---

# 24. Website design workflow after the foundation exists

This section describes a **later, separate implementation stage**.

It must not be interpreted as part of the initial Design OS/foundation build.

The intended workflow is:

```text
STAGE 1 — FOUNDATION / DESIGN OS
Codex / Claude Code
        ↓
Next.js + Payload + CMS + editor + preview + search foundations
        ↓
Minimal neutral demonstration frontend
        ↓
STOP AND REVIEW

STAGE 2 — BESPOKE WEBSITE DESIGN & BUILD
User + chosen high-capability design/coding AI
        ↓
Visual direction / interaction direction
        ↓
Bespoke components and templates
        ↓
Built against the established Design OS contract
        ↓
Preview / review / refinement

STAGE 3 — CONTENT, OPTIMISATION & LAUNCH
Reference/legacy content
        ↓
CMS population / migration
        ↓
SEO/AEO/GEO refinement
        ↓
QA / launch
```


The expected workflow is:

## Stage A — Foundation

Coding agent builds:

- Next.js;
- Payload;
- database;
- media storage abstraction;
- authentication;
- content collections;
- theme token system;
- preview;
- minimal Puck integration;
- component contract;
- deployment pipeline;
- placeholder frontend proving the system works.

## Stage B — Content/reference ingestion

Provide the AI with the current company website and any brand/content material as reference.

Extract/rewrite/import content into structured Payload records.

Do not blindly scrape the current website into final markup.

Treat the current site as a source of:

- existing copy;
- case-study information;
- services;
- team data;
- contact/legal information;
- available imagery/video references.

## Stage C — Bespoke website design/build

Use the chosen high-capability AI model/coding agent to design and implement the actual site.

It may:

- radically redesign layouts;
- create new React components;
- develop sophisticated motion;
- create unconventional portfolio interactions;
- create new visual treatments;
- improve responsive behaviour.

It must follow `AI_SITE_CONTRACT.md`.

## Stage D — Editor refinement

Once real site components exist:

- expose appropriate fields;
- remove inappropriate editor controls;
- improve labels/help text;
- configure previews;
- make case/service/team creation pleasant;
- test with representative non-technical editing tasks.

## Stage E — Production hardening and launch

Complete:

- accessibility pass;
- performance pass;
- SEO;
- analytics/consent if required;
- browser/device QA;
- backups;
- production migration;
- domain setup;
- launch checklist.

---

# 25. Important design principle for future AI agents

Future coding agents must understand this distinction:

> The CMS does not determine the design of the website.  
> The website's bespoke React components determine the design.  
> The CMS supplies content and constrained configuration to those components.

Do not let CMS schema convenience turn the site into a generic block-template design.

When creating a new bespoke component, first design the component correctly, then expose the smallest useful set of editable properties.

---

# 26. Example component contract

The implementation does not have to use this exact syntax, but should create an equivalent pattern.

```ts
type EditableSectionDefinition<Props> = {
  id: string
  label: string
  category?: string
  defaultProps: Props
  fields: EditorFieldMap<Props>
  render: React.ComponentType<Props>
}

export const heroDefinition: EditableSectionDefinition<HeroProps> = {
  id: 'hero',
  label: 'Hero',
  defaultProps: {
    eyebrow: '',
    heading: '',
    body: '',
    theme: 'light',
  },
  fields: {
    eyebrow: { type: 'text' },
    heading: { type: 'text' },
    body: { type: 'textarea' },
    image: { type: 'media' },
    theme: {
      type: 'select',
      options: ['light', 'dark', 'brand'],
    },
  },
  render: Hero,
}
```

Prefer shared definitions/adapters so schema/config is not unnecessarily duplicated.

If Puck requires a client-safe configuration, keep server-only CMS/data access outside the client configuration.

---

# 27. Example structured component

A page section that shows case studies should not own case-study content.

It might expose:

```ts
type SelectedProjectsProps = {
  heading?: string
  mode: 'manual' | 'featured' | 'latest'
  projectIds?: string[]
  limit?: number
  layout: 'grid' | 'reel' | 'feature'
}
```

The renderer resolves the underlying case-study records from Payload.

This allows a later redesign of the cards/layout without rewriting every case study.

---

# 28. Theme implementation

Use CSS custom properties or equivalent runtime-friendly tokens.

Conceptually:

```css
:root {
  --color-canvas: ...;
  --color-surface: ...;
  --color-text: ...;
  --color-text-muted: ...;
  --color-accent: ...;
  --color-highlight: ...;
  --color-border: ...;
}
```

Payload stores approved token values/presets.

The frontend maps those settings into the token system.

Provide safe defaults so the website still renders if optional theme data is unavailable.

Do not turn every component into its own independent colour picker.

---

# 29. Admin usability requirements

Content editors should not need to understand:

- React;
- Git;
- deployment;
- JSON;
- database terminology;
- Puck internals;
- implementation component names.

Use human labels.

For example:

- `caseStudies` → "Case Studies"
- `heroMedia` → "Hero image/video"
- `themeVariant` → "Colour style"

Add concise field descriptions only where ambiguity exists.

Group fields logically rather than presenting one enormous form.

---

# 30. Seed/demo content

During development create representative seed content sufficient to test:

- homepage;
- at least three case studies;
- at least three services;
- at least six team members;
- navigation;
- media;
- multiple page sections;
- theme changes.

Seed data must be clearly non-production and easy to remove/reset.

---

# 31. Phase plan

## Phase 1 — Technical foundation

Deliver:

- repository initialised;
- Next.js + TypeScript;
- Payload integrated;
- PostgreSQL adapter;
- local environment;
- `/admin`;
- authentication;
- basic Media collection;
- Pages collection;
- Case Studies collection;
- Services collection;
- Team Members collection;
- Navigation;
- Site Settings;
- Theme settings;
- migrations;
- seed mechanism;
- `IMPLEMENTATION_STATUS.md`.

Exit criteria:

- app runs locally;
- admin is usable;
- records can be created;
- public placeholder routes render Payload content.

Do not begin any final visual website design before this is working. Use only deliberately minimal test scaffolding.

## Phase 2 — Editing/preview framework

Deliver:

- draft and publish flow;
- live preview;
- responsive preview widths;
- design token plumbing;
- initial Puck editor integration for Pages;
- component registry;
- at least 3 proof-of-concept bespoke sections;
- AI Site Contract;
- basic editor permissions;
- Approved Facts / Evidence Library;
- initial relational taxonomy/entity model;
- pre-publish QA framework;
- scheduled publishing configuration;
- secure draft-preview workflow.

Exit criteria:

- editor can build/edit a test page;
- editor can preview phone/tablet/desktop;
- publishing changes public output without a code deploy;
- structured collection content remains outside Puck page JSON.

## Phase 2B — Search foundation

Deliver the search architecture before final visual design is complete:

- Search Strategy / Company Search Profile;
- reusable page Search panel;
- metadata defaults/overrides;
- canonical handling;
- sitemap;
- robots policies;
- redirect model;
- structured-data generator;
- Organization/WebSite/Breadcrumb schemas;
- Service and media schema support where appropriate;
- Search Console/Bing verification hooks;
- IndexNow integration;
- indexability tests;
- old-site URL/content inventory mechanism or documented import workflow;
- AI Search Assistant interfaces/provider abstraction, even if the full assistant UI is deferred.

Exit criteria:

- representative Pages, Case Studies and Services output correct metadata;
- structured data validates;
- sitemap/canonical/robots behavior is correct;
- staging is protected from indexing;
- URL changes can be redirected;
- publishing can notify IndexNow;
- future AI search features have clean provider/data interfaces.

Do not wait until Phase 6 to establish these foundations.

## Phase 3 — Deployment foundation

Deliver:

- GitHub-ready project;
- Vercel configuration;
- production DB configuration;
- production media storage;
- preview environment support;
- environment documentation;
- CI checks;
- deployment instructions.

Exit criteria:

- preview deployment works from a non-production Git branch;
- preview deployment uses non-production data/secrets by default;
- production-like deployment works;
- `/admin` works in hosted environment;
- uploads persist;
- production code remains unchanged until the production branch is merged/deployed.

## Phase 4 — DO NOT BEGIN UNTIL SEPARATELY AUTHORISED: Bespoke Company Website Design & Build

### HARD GATE

This phase is intentionally outside the scope of the initial foundation build.

Do not begin this phase automatically after Phase 3.

Proceed only after the user has reviewed the completed Design OS/foundation and gives a new explicit instruction to start the bespoke website design/build phase.

At that point, use the company's chosen AI design/coding workflow to create the real visual site.

Before starting visual implementation:

1. inventory reference content;
2. define sitemap;
3. define required templates/content types;
4. define visual direction;
5. define typography;
6. define motion/interaction principles.

Then build the site against the existing CMS/editor contracts.

Do not replace the foundation with a generic site template.

## Phase 5 — Editorial refinement

Test these real editor tasks:

1. Change homepage headline.
2. Replace homepage image.
3. Create a complete new case study.
4. Reorder featured projects.
5. Create a new service.
6. Add a team member.
7. Remove/deactivate a team member.
8. Change the accent colour.
9. Rearrange permitted homepage sections.
10. Preview each change on mobile.
11. Save without publishing.
12. Publish.
13. Restore a previous version where supported.
14. Upload a new image and receive an automatic context-aware alt-text draft.
15. Mark an image as decorative and confirm the frontend renders empty alt text.
16. Regenerate or manually override AI-generated alt text.
17. Run a bulk audit for missing/weak alt text.

Fix any task that requires technical knowledge unnecessarily.

## Phase 5B — Search intelligence and content optimisation

Once representative real content exists, implement/refine the Search & Content workspace.

Deliver the highest-value subset of:

- site-wide crawl/audit;
- page-level AI recommendations;
- title/meta suggestions;
- content-gap recommendations;
- internal-link suggestions;
- schema completeness checks;
- missing-page/topic recommendations;
- legacy-site comparison;
- human review/apply workflow;
- optional Google Search Console connection if the production property is available;
- performance/Lighthouse integration where useful.

Use the real company content and Search Strategy profile to evaluate quality.

Exit criteria:

- AI recommendations are grounded in actual site/business context;
- editors can accept/reject recommendations safely;
- the assistant cannot silently publish generated content;
- recommendations are explainable and prioritised;
- AI functionality can be disabled without breaking editing or publishing.

## Phase 6 — Launch readiness

Complete:

- final content migration;
- SEO;
- sitemap/robots;
- analytics if required;
- redirects from the existing website;
- accessibility QA;
- performance QA;
- device/browser QA;
- forms;
- cookie/privacy requirements if applicable;
- backups;
- security review;
- production domain;
- final editor documentation.

---

# 32. Acceptance criteria

The project is successful when all of the following are true:

1. The visual website is fully bespoke and normal application code.
2. A coding agent can continue to redesign it through the repository.
3. Company users can edit text/images without code.
4. A company user can create a new case study without code.
5. A company user can create a new service page without code.
6. A company user can add/remove/reorder team members without code.
7. Team layouts remain functional when team count changes.
8. Editors can preview drafts.
9. Editors can preview desktop/tablet/mobile.
10. Editors can manage approved page sections on selected pages.
11. Editors can change approved semantic colour tokens.
12. Normal content publishing does not require a code deployment.
13. Deep design/code changes use Git and a normal deployment.
14. Existing CMS content survives compatible component redesigns.
15. Production uploads use persistent storage.
16. Production data uses persistent managed storage.
17. Admin is authenticated.
18. Draft content is not publicly exposed.
19. Site passes agreed accessibility/performance/SEO QA.
20. Documentation is sufficient for a different coding agent to continue the project.
21. Every indexable page has sensible automatic metadata with editable overrides.
22. XML sitemap, canonical URLs, robots policies and redirect handling are implemented and tested.
23. Appropriate structured data is generated from CMS content and validates.
24. Search/AI-search crawler policy is explicit and configurable.
25. Case studies/services contain sufficient visible textual context to be understandable without relying solely on imagery/video.
26. The system can audit pages and produce prioritised search/content recommendations without auto-publishing them.
27. The AI Search Assistant is provider-abstracted and can be disabled without affecting core CMS functionality.
28. Search-performance integrations can be added/connected without restructuring content models.
29. New editorial images can receive context-aware automatic alt-text drafts.
30. Editors can manually override, regenerate or mark images as decorative.
31. Decorative imagery renders with appropriate empty alt text rather than generated descriptions.
32. The system can audit the media library/site for missing or weak alt text without keyword-stuffing content.
33. AI-generated content cannot invent factual company/project claims and can trace material claims back to approved CMS/reference sources where practical.
34. Missing factual information is requested from the user rather than silently fabricated.
35. Structured relationships connect case studies, services, clients/capabilities/sectors where relevant.
36. Important content can be scheduled for publish/unpublish.
37. Editors can preview unpublished CMS changes without affecting the public site.
38. Code/design changes receive a separate hosted preview URL before production deployment.
39. Preview/staging code does not write to the production database by default.
40. A unified pre-publish QA check identifies factual, accessibility, search and technical issues.
41. The initial implementation run stops after Phase 3 with only a minimal demonstration frontend; no final company website visual design is undertaken without separate explicit authorisation.

---

# 33. Explicit non-goals for version 1

Do NOT build:

- a SaaS product;
- multi-tenant support;
- a general website importer;
- arbitrary React-code introspection to discover editable elements;
- a Figma replacement;
- arbitrary freeform canvas editing;
- a plugin marketplace;
- billing;
- customer account management;
- full no-code application development;
- support for unrelated websites;
- a proprietary deployment platform;
- an AI chat interface inside the CMS unless a concrete need emerges.

The system only needs to serve this company website.

---

# 34. Future possibilities — deliberately out of scope

Architect cleanly enough that these could be explored later, but do not build them now:

- AI-assisted content editing inside admin;
- "create a new section from a prompt";
- automatic section registration;
- reusable website starter extraction;
- multi-site support;
- design-system linting;
- visual regression approval UI;
- direct Frame.io integration;
- DAM integration;
- role/workflow approval chains;
- scheduled campaigns/themes.

---

# 35. First implementation task

Begin with Phase 1.

Before writing substantial code:

1. confirm the current stable compatibility requirements of Next.js, Payload and Puck from their official documentation;
2. select the exact package versions;
3. scaffold the project;
4. create `IMPLEMENTATION_STATUS.md`;
5. record the chosen package versions and hosting assumptions;
6. implement the CMS/data foundation;
7. prove one collection end-to-end in the frontend before expanding the schema.

Do not spend time designing the final company website during Phase 1.

The first milestone is:

> **A locally running bespoke Next.js/Payload project where an authenticated editor can create/edit/publish structured content and see it rendered on a deliberately minimal demonstration frontend.**

Before stopping, also complete the Phase 2B search foundation and Phase 3 deployment/preview foundation so SEO/search architecture and review workflows are established before final templates and visual design begin.

### STOP CONDITION

Once Phases 1, 2, 2B and 3 are stable:

- do not proceed to Phase 4;
- update the implementation documentation;
- summarise the completed foundation;
- identify any remaining foundation risks;
- hand the project back to the user for review.

The next stage — bespoke website design/build — requires a new explicit instruction.
