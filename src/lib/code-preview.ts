// A code preview is Vercel's test build of a branch or pull request. It runs on a throwaway copy
// of the database, so anything saved there would be lost. It is therefore read-only, and says
// where the real workspace is. People always edit, preview and publish content at the live
// address (/admin → Save Preview → Publish); code changes go live by merging on GitHub.
//
// The Design OS product repository's demo lives in Vercel's Preview environment on purpose and
// sets DESIGNOS_PREVIEW_EDITING=allow to stay editable.
export const codePreview = () =>
  process.env.VERCEL_ENV === 'preview' && process.env.DESIGNOS_PREVIEW_EDITING !== 'allow'

// The live site's address, for "edit your website here" links.
export function liveAddress() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return host ? `https://${host}` : null
}

export const codePreviewMessage = () =>
  `This is a code preview: a test copy of your website for checking design and code changes. Nothing can be saved here. Edit, preview and publish your website at ${liveAddress() || 'your live address'}/admin.`
