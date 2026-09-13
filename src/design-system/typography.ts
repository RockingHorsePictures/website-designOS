import type { CSSProperties } from 'react'

// Stable IDs are stored in the CMS. Only this trusted registry can supply CSS font stacks.
export const fontCatalog = {
  'system-sans': { label: 'System sans serif', family: 'system-ui, sans-serif' },
  'system-serif': { label: 'System serif', family: 'Georgia, "Times New Roman", serif' },
  'system-mono': { label: 'System monospace', family: 'ui-monospace, "Courier New", monospace' },
  inter: { label: 'Inter', family: '"Inter Variable", system-ui, sans-serif' },
  'source-sans-3': {
    label: 'Source Sans 3',
    family: '"Source Sans 3 Variable", system-ui, sans-serif',
  },
  lora: { label: 'Lora', family: '"Lora Variable", Georgia, serif' },
}
export const fontOptions = [
  ...Object.entries(fontCatalog).map(([value, font]) => ({
    value,
    label: font.label,
  })),
  { value: 'custom', label: 'Custom uploaded font' },
]
export const weightOptions = [
  { value: '100', label: 'Thin — 100' },
  { value: '200', label: 'Extra light — 200' },
  { value: '300', label: 'Light — 300' },
  { value: '400', label: 'Regular — 400' },
  { value: '500', label: 'Medium — 500' },
  { value: '600', label: 'Semibold — 600' },
  { value: '700', label: 'Bold — 700' },
  { value: '800', label: 'Extra bold — 800' },
  { value: '900', label: 'Black — 900' },
]
export const typographyDefaults = {
  bodyFont: 'system-sans',
  headingFont: 'system-sans',
  bodyWeight: '400',
  headingWeight: '700',
  emphasisWeight: '700',
} as const
export type TypographyValues = Partial<
  Record<keyof typeof typographyDefaults | 'bodyFontFiles' | 'headingFontFiles', unknown>
>
type FontFile = {
  id: number
  filename: string
  weightFrom: number
  weightTo?: number | null
  style: 'normal' | 'italic'
}
export function fontFiles(value: unknown): FontFile[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (f): f is FontFile =>
      f &&
      typeof f === 'object' &&
      Number.isInteger(f.id) &&
      typeof f.filename === 'string' &&
      /\.(woff2|woff)$/i.test(f.filename) &&
      Number.isInteger(f.weightFrom) &&
      f.weightFrom >= 100 &&
      f.weightFrom <= 900 &&
      (f.weightTo == null ||
        (Number.isInteger(f.weightTo) && f.weightTo >= f.weightFrom && f.weightTo <= 900)) &&
      (f.style === 'normal' || f.style === 'italic'),
  )
}
export function customFontCSS(values: TypographyValues): string {
  return (['body', 'heading'] as const)
    .flatMap((role) =>
      values[`${role}Font`] === 'custom'
        ? fontFiles(values[`${role}FontFiles`]).map((font) => {
            // Use our own file route and encoded filename; CMS text never becomes raw CSS.
            const url = `/api/fonts/file/${encodeURIComponent(font.filename).replace(/'/g, '%27')}`
            return `@font-face{font-family:"DesignOS-${role}";src:url("${url}");font-weight:${font.weightFrom} ${font.weightTo ?? font.weightFrom};font-style:${font.style};font-display:swap;}`
          })
        : [],
    )
    .join('\n')
}
export function typographyStyle(values: TypographyValues = {}): CSSProperties {
  const family = (value: unknown, fallback: keyof typeof fontCatalog) =>
    typeof value === 'string' && Object.hasOwn(fontCatalog, value)
      ? fontCatalog[value as keyof typeof fontCatalog].family
      : fontCatalog[fallback].family
  const weight = (value: unknown, fallback: string) =>
    weightOptions.some((w) => w.value === value) ? value : fallback
  return {
    '--font-body':
      values.bodyFont === 'custom' && fontFiles(values.bodyFontFiles).length
        ? '"DesignOS-body", system-ui, sans-serif'
        : family(values.bodyFont, typographyDefaults.bodyFont),
    '--font-heading':
      values.headingFont === 'custom' && fontFiles(values.headingFontFiles).length
        ? '"DesignOS-heading", system-ui, sans-serif'
        : family(values.headingFont, typographyDefaults.headingFont),
    '--weight-body': weight(values.bodyWeight, typographyDefaults.bodyWeight),
    '--weight-heading': weight(values.headingWeight, typographyDefaults.headingWeight),
    '--weight-emphasis': weight(values.emphasisWeight, typographyDefaults.emphasisWeight),
  } as CSSProperties
}
