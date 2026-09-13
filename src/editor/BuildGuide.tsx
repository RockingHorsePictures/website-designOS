'use client'
import { useState } from 'react'
import workspace from '../../site-workspace.json'

export function BuildGuide() {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [copied, setCopied] = useState(false)
  const repository = workspace.repositoryUrl || 'the Design OS repository open in this workspace'
  const prompt =
    mode === 'existing'
      ? `I want to start designing and building this company's website using the existing Design OS foundation. Open ${repository}${workspace.foundationBranch ? `, starting from ${workspace.foundationBranch}` : ''}. Read START_HERE.md, AI_SITE_CONTRACT.md and DESIGN_HANDOFF.md first. This authorises the website design phase. Preserve the existing CMS, editable content, theme and brand assets, section contracts, preview and publishing. Start by gathering my company brief, approved content and visual references, then establish the sitemap and representative desktop/mobile designs for review. Implement and test in a feature branch and show a protected preview. Keep production unchanged until a separate release approval.`
      : `Create a separate new company website from the Design OS starter at ${repository}${workspace.foundationBranch ? ` (branch ${workspace.foundationBranch})` : ''}. Read START_HERE.md and NEW_SITE.md. Use the starter export workflow to make a fresh project; preserve AI_SITE_CONTRACT.md and the CMS architecture. Give it its own repository, database, media storage, secrets and hosting project. Do not change or connect it to the source site's resources. Gather my company name, site brief and approved assets, then build and test its website in Preview. Keep production unchanged until a separate release approval.`
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([`# Website AI handoff\n\n${prompt}\n`], { type: 'text/markdown' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'website-ai-handoff.md'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <section aria-label="Build your website with AI" className="dos-build-guide">
      <details>
        <summary>
          <span className="dos-build-symbol" aria-hidden="true">
            ✦
          </span>
          <span>
            <strong>Build your website with AI</strong>
            <span>Start a design conversation, with your website’s structure ready to go.</span>
          </span>
          <span className="dos-build-expand" aria-hidden="true">
            +
          </span>
        </summary>
        <div className="dos-build-content">
          <p>
            Continue in the Codex project connected to this website, or use these instructions in a
            new connected coding task. This editor manages content; your AI workspace handles design
            and code.
          </p>
          <label htmlFor="build-mode">What are you starting?</label>{' '}
          <select
            id="build-mode"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as 'existing' | 'new')
              setCopied(false)
            }}
          >
            <option value="existing">Design this website</option>
            <option value="new">Start a separate website</option>
          </select>
          <p>
            {mode === 'existing'
              ? 'Use this project. A new conversation does not require a new website or database.'
              : 'Use a fresh project for each company. The reusable starter carries the editing system and contract; each site gets separate content and services.'}
          </p>
          <label htmlFor="build-instructions">Instructions to give your AI workspace</label>
          <textarea id="build-instructions" readOnly value={prompt} rows={6} />
          <div className="dos-button-row">
            <button className="dos-button dos-button--primary" type="button" onClick={copy}>
              {copied ? 'Instructions copied' : 'Copy instructions'}
            </button>{' '}
            <button className="dos-button" type="button" onClick={download}>
              Download instructions
            </button>
          </div>
          <p className="dos-helper" role="status">
            {copied
              ? 'Paste these instructions into your connected AI workspace, then add your brief and references.'
              : 'You can also select and copy the text directly.'}
          </p>
          <p>
            {workspace.repositoryUrl && (
              <>
                <a
                  href={`${workspace.repositoryUrl}/tree/${workspace.foundationBranch || 'main'}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open project on GitHub
                </a>{' '}
                ·{' '}
              </>
            )}
            <a href="https://chatgpt.com/codex" target="_blank" rel="noreferrer">
              Open Codex on the web
            </a>
          </p>
          <p>
            For another computer or a cloud session, connect the repository and configure a
            development environment. Access to this editor alone does not grant code or deployment
            access. Keep passwords and service keys in environment settings.
          </p>
          <p>
            Prepare your assets: <a href="/admin/globals/site-settings">Company &amp; logos</a> ·{' '}
            <a href="/admin/collections/fonts">Font files</a> ·{' '}
            <a href="/admin/globals/theme">Colours &amp; typography</a>
          </p>
        </div>
      </details>
    </section>
  )
}
