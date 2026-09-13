# Start here: build a website with Design OS

**For this website, you can continue the existing Codex conversation.** A new conversation is optional; open the same project folder/repository so it has the same code and contract. The admin dashboard's **Build your website with AI** panel provides copyable instructions and a downloadable handoff.

The CMS is the place to edit content, upload brand assets and publish. The connected AI coding workspace is the place to design and build the website. This foundation does not include a chat-based site generator inside the CMS.

## Where to start a conversation

| Goal                                | Where to work                            | What to provide                                                   |
| ----------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Continue this website               | This Codex conversation                  | Your brief, approved content and design references                |
| Fresh conversation for this website | New Codex task in this same project      | Dashboard handoff; start from the branch in `site-workspace.json` |
| Another computer or cloud session   | Codex connected to the GitHub repository | Correct repository/branch plus a working development environment  |
| Separate website/company            | New project created using `NEW_SITE.md`  | New brief and separate services and credentials                   |

For cloud work, connect the repository in [Codex](https://chatgpt.com/codex), create its environment and select the foundation branch. Install dependencies and configure a disposable development database using README.md. Store credentials in the environment's secret settings. GitHub-backed Vercel previews can deploy pushed branches after setup; direct deployment or hosted content editing requires those additional credentials. A CMS login or a repository link pasted into ordinary chat does not by itself provide a runnable coding environment. See [official cloud setup](https://learn.chatgpt.com/docs/cloud).

## What makes it repeatable

The contract lives in the repository, not in the conversation history. `AGENTS.md` directs future agents here. `AI_SITE_CONTRACT.md` defines the architectural rules, `DESIGN_HANDOFF.md` defines the design workflow, and the actual schemas, migrations, renderer and tests enforce the editable structure. Copying only the specification is insufficient: reuse the working foundation as well.

Read in order: `AI_SITE_CONTRACT.md`, `DESIGN_HANDOFF.md`, `ARCHITECTURE.md`, `EDITOR_GUIDE.md`, `IMPLEMENTATION_STATUS.md`. Consult V5 for original intent; later explicit user instructions can extend its phase boundaries. Do not infer authorisation to begin visual design from these documents alone.

Keep `site-workspace.json` updated when a site's repository or working branch changes. The dashboard uses it to generate the correct handoff. Until the original foundation PR is merged, `foundation/design-os` contains the app and `main` does not.

## Prepare the website

1. Enter company identity and upload logos in **Site Settings → Brand assets**.
2. Upload licensed WOFF2/WOFF files in **Font files**, then select custom body/heading fonts and their weights in **Theme tokens**.
3. Provide the AI with goals, audiences, pages, factual sources, copy, imagery and design references.
4. Ask it to begin website design using the dashboard handoff. Review the sitemap and representative pages before extending the design.
5. Review a working Preview; launch is a separate release decision.

## AI connection (0.2.1)

Before CMS work, read AI_CONNECTION.md. In the installed website folder run `npm run ai:check` and `npm run ai:context`; read fresh Production and code-preview approvals from `.designos/ai-context.json`. The installer provisions separate restricted accounts. If missing, use the documented `npm run ai:connect` repair after upgrading/migrating, not a request for the owner to paste passwords into chat. Use `npm run ai:request` for automated CMS operations. Production access is read-only and its approvals are authoritative. Browser-only conversations can use the admin’s credential-free context download for planning, but need a connected coding runtime for writes.
