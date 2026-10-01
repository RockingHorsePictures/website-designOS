# Start here: build a website with Design OS

Design OS gives an AI coding agent a working CMS, publishing system and editing contract, so it can design a **bespoke** website that the owner then runs themselves: editing copy, swapping images, adding pages and rearranging sections without code or AI.

The CMS (`/admin`) is where content is edited, brand assets uploaded and the site published. The AI coding workspace is where the website is designed and built. There is no chat-based site generator inside the CMS.

## Where to work

| Goal                                       | Where                                                                                                                       | What to provide                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Build or change this website               | **Claude Code** opened in this website folder (terminal, desktop app or IDE). Other agents that read `AGENTS.md` also work. | Your brief, approved content, brand assets and design references                                             |
| Explore visual directions first (optional) | **Claude Design**, then hand off to Claude Code                                                                             | The design brief from `/designos-import-design`                                                              |
| Plan or review without code access         | Claude Desktop, Cowork or any chat                                                                                          | The credential-free **website context** download from the admin Overview                                     |
| Another computer or cloud session          | A coding agent connected to the GitHub repository                                                                           | Correct branch plus this site's private environment, set up securely (docs/AI_CONNECTION.md, docs/DEPLOY.md) |
| A separate website or company              | A new site from the Deploy Button (docs/DEPLOY.md)                                                                          | A new brief and separate services and credentials                                                            |

A new conversation for the same site needs no duplication: the contract lives in the repository, not in chat history. `AGENTS.md` (imported by `CLAUDE.md`) directs every agent here.

## In Claude Code

1. Open this website's folder and approve the `design-os` MCP server when prompted (`/mcp` shows it).
2. Run `/designos-build` to design and build, `/designos-content` to add pages or copy, `/designos-audit` for SEO, AI-search, schema, content and accessibility reviews, and `/designos-launch-check` before going live. See docs/AI_TOOLKIT.md for every tool.
3. Connect to the live site with `npm run ai:connect -- live https://<site>`. The owner approves it in the admin, and no password or key is ever pasted into chat. Content edits are drafts, allowed only while the owner switches on Overview → AI editing. See docs/AI_CONNECTION.md.

## Read in order

`AI_SITE_CONTRACT.md` (rules), `docs/DESIGN_HANDOFF.md` (design workflow), `docs/SECTIONS.md` (the editable page structure), `docs/AI_TOOLKIT.md` (skills, subagents, MCP, audits), `docs/ARCHITECTURE.md`, `EDITOR_GUIDE.md` (what owners do), `docs/DEPLOY.md` (hosting and updates) and `IMPLEMENTATION_STATUS.md` (verified state). `docs/history/COMPANY_WEBSITE_BUILD_SPEC_V5.md` records original intent; later explicit instructions take precedence. These documents alone do not authorise visual design work: the owner must ask for it.

Keep `site-workspace.json` updated when the site's repository or working branch changes; the admin handoff uses it. Development happens on `main`, both in the Design OS product repository and in each website made from it. In the product repository, `stable` points at the latest release (the Deploy Button clones it).

## Prepare the website

1. Enter company details and upload logos in **Site Settings**. Add the address, language and organisation type used for search engines.
2. Upload licensed WOFF2/WOFF files in **Font files**, then choose fonts and weights in **Theme tokens**.
3. Fill in **Search Strategy**: audiences, their questions, tone, terminology and claims to avoid. Add verified facts under **Approved Facts & Evidence**.
4. Give the AI your goals, audiences, pages, factual sources, copy, imagery and design references. Review the sitemap and representative pages before the design is extended.
5. Review a working Preview. Launch is a separate release decision.

## AI connection

Before CMS work, read docs/AI_CONNECTION.md. In the installed website folder, use the MCP tools `designos_check` and `designos_context`, or run `npm run ai:check` and `npm run ai:context`, and read fresh approvals from `.designos/ai-context.json`. Production access is read-only and its approvals are authoritative. Code-preview and local access can edit unlocked content as drafts; AI accounts cannot approve, delete or publish.
