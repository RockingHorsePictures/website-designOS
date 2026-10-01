import { codePreview, liveAddress } from '@/lib/code-preview'

// Shown at the top of the site, the admin, the composer and setup on a code preview.
export function CodePreviewBanner() {
  if (!codePreview()) return null
  const live = liveAddress()
  return (
    <div className="dos-code-preview" role="note" aria-label="Code preview">
      <strong>Code preview</strong>
      <span>
        A test copy for checking design and code changes. Nothing you change here is kept. Merge the
        pull request on GitHub to make these changes live.
      </span>
      {live && (
        <a href={`${live}/admin`}>
          Edit your website at {live.replace(/^https:\/\//, '')}/admin{' '}
          <span aria-hidden="true">→</span>
        </a>
      )}
    </div>
  )
}
