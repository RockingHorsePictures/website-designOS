# AI toolkit

Design OS works with any AI coding agent that can read this repository. It is set up first for **Claude**: Claude Code (terminal, desktop app, IDE), Claude Desktop and Cowork. You use your existing subscription; nothing runs AI inside the CMS unless you configure it, and the website never depends on AI to be edited.

| Tool                    | What it gives the AI                                                                | Where it lives                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Project instructions    | Architecture rules, locks, facts policy                                             | `AGENTS.md` → `AI_SITE_CONTRACT.md`, `START_HERE.md` (`CLAUDE.md` imports `AGENTS.md`) |
| MCP server `design-os`  | CMS read/write as a restricted account, section catalog, site health, crawler audit | `scripts/mcp.mjs`, registered in `.mcp.json`                                           |
| Skills (slash commands) | Repeatable workflows                                                                | `.claude/skills/*/SKILL.md`                                                            |
| Subagents               | Parallel specialist reviews                                                         | `.claude/agents/*.md`                                                                  |
| CLI                     | The same capabilities for any agent or a person                                     | `npm run ai:*`, `npm run audit`, `npm run sections`                                    |

## Skills

| Command                   | Use it to                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `/designos-build`         | Brief → sitemap → visual direction → bespoke editable sections → pages → verification          |
| `/designos-import-design` | Prepare a Claude Design brief, then turn a handoff/export/screenshots into tokens and sections |
| `/designos-new-section`   | Add or change an editable section correctly (schema, composer fields, renderer, tests)         |
| `/designos-content`       | Add pages, FAQs, services and copy as drafts, with facts discipline                            |
| `/designos-audit`         | SEO, AEO/GEO, schema, content, accessibility and structure audit, and an action plan           |
| `/designos-launch-check`  | Go-live readiness: configuration, email, backups, crawler policy, release                      |

Claude also picks these skills up automatically when a request matches, for example "audit my site for AI search".

## Specialist subagents

`seo-auditor`, `answer-engine-auditor` (AEO/GEO), `schema-auditor`, `content-reviewer`, `accessibility-auditor` and `structure-reviewer`. They are read-only reviewers. `/designos-audit` runs them in parallel on the same measured report and merges the results into one prioritised plan.

## MCP tools

| Tool                                     | Notes                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `designos_check`                         | Which environments are reachable and each account's scope                           |
| `designos_context`                       | Refreshes `.designos/ai-context.json`: content, editable fields, approval states    |
| `cms_read` / `cms_write`                 | Read any protected collection or global; write drafts to `preview` or `local`       |
| `cms_upload_image`                       | Upload an image from inside the site folder, with alt text                          |
| `list_sections` / `validate_composition` | Section catalog as JSON schema; validate a page before saving                       |
| `site_health`                            | Whole-site CMS checks (links, orphans, duplicates, alt text, claims, brand details) |
| `audit_site`                             | Crawls a URL and writes `report.md` / `report.json` under `.designos/audits/`       |

Every CMS call goes through `scripts/ai.mjs`, which uses the installer-provisioned AI accounts. Production is read-only. AI accounts cannot approve, unlock, delete, verify facts, sign off factual review or publish. Locked fields are rejected by the CMS itself. Credentials never appear in tool output.

## Connect

**Claude Code** (terminal, desktop app or IDE): open the website folder. Claude Code reads `.mcp.json` and asks you to approve the `design-os` server once. Check it with `/mcp`. Skills appear under `/`.

**Claude Desktop**: add the server to `claude_desktop_config.json` (Settings → Developer → Edit Config; on Windows `%APPDATA%\Claude\claude_desktop_config.json`, on macOS `~/Library/Application Support/Claude/claude_desktop_config.json`), then fully quit and reopen Claude:

```json
{
  "mcpServers": {
    "design-os": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\path\\to\\your-site\\scripts\\mcp.mjs"]
    }
  }
}
```

The server runs in the website folder named by its path, so each site gets its own entry (`design-os-acme`, `design-os-other`). Never point one site's entry at another site's folder.

**Cowork**: Cowork can use local MCP servers when they are added through its developer or plugin settings (your organisation's admin may need to enable this). Use the same command and path as Claude Desktop. Without that, Cowork can still plan and review using the credential-free **website context** download from the admin Overview.

**Other agents (Codex, Cursor and others)**: `AGENTS.md` is read automatically by most. Use the CLI equivalents below, or register `node scripts/mcp.mjs` as an MCP server if the agent supports MCP.

## CLI equivalents

```sh
npm run ai:check                      # reachable environments and scope
npm run ai:context                    # refresh .designos/ai-context.json
npm run ai:health -- preview          # whole-site CMS checks
npm run ai:request -- preview req.json  # read/create/update/upload (see AI_CONNECTION.md)
npm run sections -- catalog           # section library as JSON schema
npm run sections -- validate page.json
npm run audit -- https://your-site.com --max 300
```

Protected Vercel previews: set `VERCEL_AUTOMATION_BYPASS_SECRET` in your shell before `npm run audit` so the crawler can reach them.

## What the audits cover

- **SEO**: titles, descriptions, canonicals, indexability, sitemap and robots, duplicates, headings, internal links and orphans, redirects, Open Graph, response time.
- **AEO / GEO**: crawler access split into search engines, AI answer engines (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot and others) and AI training crawlers, each controlled in Search Strategy; `/llms.txt`; FAQ coverage; entity consistency; content depth; citable facts.
- **Schema**: JSON-LD validity, required properties, `@id` graph, rich-result opportunities.
- **Content**: claims versus Approved Facts, prohibited claims, tone, clarity, placeholders, calls to action.
- **Accessibility**: headings, alt text, link names, form labels, contrast of theme tokens, iframes, language.
- **Structure**: sitemap, navigation, gaps, overlaps, conversion paths.

The crawler measures; the subagents judge; the owner approves. Owners without AI still get the deterministic checks in the admin: **Overview → Site health**, and **Search & quality → Check this page** on each record.

## Claude Design or Claude Code for visual design?

Both, for different jobs. Claude Design is quicker for exploring many visual directions and for collaborating with people who prefer a canvas. Claude Code produces the production result, because only it can wire components to the CMS, tokens, locks and tests. The recommended flow is optional exploration in Claude Design, then implementation in Claude Code with `/designos-import-design`. Designing directly in Claude Code (rendered pages plus screenshots) remains the default and works well. See DESIGN_HANDOFF.md.
