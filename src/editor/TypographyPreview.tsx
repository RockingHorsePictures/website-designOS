'use client'
import { useFormFields } from '@payloadcms/ui'
import { typographyStyle } from '../design-system/typography'
import '../styles/typography.css'

export function TypographyPreview() {
  const values = useFormFields(([fields]) => ({
    bodyFont: fields.bodyFont?.value,
    headingFont: fields.headingFont?.value,
    bodyWeight: fields.bodyWeight?.value,
    headingWeight: fields.headingWeight?.value,
    emphasisWeight: fields.emphasisWeight?.value,
  }))
  return (
    <section
      aria-label="Typography sample"
      className="site-typography"
      style={{
        ...typographyStyle(values),
        border: '1px solid var(--theme-elevation-200)',
        padding: '1.5rem',
        marginBlock: '1rem',
      }}
    >
      <h3>Headings that tell your story</h3>
      <p>
        Preview how your website text will read. <strong>This is emphasised text.</strong>{' '}
        <em>This is italic text.</em>
      </p>
      <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789</p>
      <p>The sample updates as you choose. Save to apply these fonts across the website.</p>
    </section>
  )
}
