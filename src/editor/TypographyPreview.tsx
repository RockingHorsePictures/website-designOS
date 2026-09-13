'use client'
import { useFormFields } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import { typographyStyle } from '../design-system/typography'
import { CustomFonts } from '../design-system/CustomFonts'
import '../styles/typography.css'

export function TypographyPreview() {
  const values = useFormFields(([fields]) => ({
    bodyFont: fields.bodyFont?.value,
    headingFont: fields.headingFont?.value,
    bodyWeight: fields.bodyWeight?.value,
    headingWeight: fields.headingWeight?.value,
    emphasisWeight: fields.emphasisWeight?.value,
    bodyFontFiles: fields.bodyFontFiles?.value,
    headingFontFiles: fields.headingFontFiles?.value,
  }))
  const ids = [
    ...new Set(
      [values.bodyFontFiles, values.headingFontFiles]
        .flatMap((v) => (Array.isArray(v) ? v : []))
        .filter((id) => Number.isInteger(id)),
    ),
  ].join(',')
  const [library, setLibrary] = useState<{ id: number }[]>([])
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!ids) return
    const controller = new AbortController()
    fetch(`/api/fonts?where[id][in]=${encodeURIComponent(ids)}&limit=100&depth=0`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Font library unavailable')
        return response.json()
      })
      .then((data) => {
        setLibrary(data.docs)
        setFailed(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [ids])
  const resolve = (v: unknown) =>
    Array.isArray(v) ? v.map((id) => library.find((f) => f.id === id)).filter(Boolean) : []
  const theme = {
    ...values,
    bodyFontFiles: resolve(values.bodyFontFiles),
    headingFontFiles: resolve(values.headingFontFiles),
  }
  return (
    <section
      aria-label="Typography sample"
      className="site-typography"
      style={{
        ...typographyStyle(theme),
        border: '1px solid var(--theme-elevation-200)',
        padding: '1.5rem',
        marginBlock: '1rem',
      }}
    >
      <CustomFonts theme={theme} />
      <h3>Headings that tell your story</h3>
      <p>
        Preview how your website text will read. <strong>This is emphasised text.</strong>{' '}
        <em>This is italic text.</em>
      </p>
      <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789</p>
      <p>The sample updates as you choose. Save to apply these fonts across the website.</p>
      {(values.bodyFont === 'custom' || values.headingFont === 'custom') && (
        <p>
          Add files for each weight and style you use. Missing variants may be synthesised by the
          browser. {failed ? 'The font sample could not load; refresh to try again.' : ''}
        </p>
      )}
    </section>
  )
}
