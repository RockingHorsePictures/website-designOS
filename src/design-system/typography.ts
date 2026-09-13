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
export const fontOptions = Object.entries(fontCatalog).map(([value, font]) => ({
  value,
  label: font.label,
}))
export const weightOptions = [
  { value: '400', label: 'Regular — 400' },
  { value: '500', label: 'Medium — 500' },
  { value: '600', label: 'Semibold — 600' },
  { value: '700', label: 'Bold — 700' },
]
export const typographyDefaults = {
  bodyFont: 'system-sans',
  headingFont: 'system-sans',
  bodyWeight: '400',
  headingWeight: '700',
  emphasisWeight: '700',
} as const
export type TypographyValues = Partial<Record<keyof typeof typographyDefaults, unknown>>
export function typographyStyle(values: TypographyValues = {}): CSSProperties {
  const family = (value: unknown, fallback: keyof typeof fontCatalog) =>
    typeof value === 'string' && Object.hasOwn(fontCatalog, value)
      ? fontCatalog[value as keyof typeof fontCatalog].family
      : fontCatalog[fallback].family
  const weight = (value: unknown, fallback: string) =>
    weightOptions.some((w) => w.value === value) ? value : fallback
  return {
    '--font-body': family(values.bodyFont, typographyDefaults.bodyFont),
    '--font-heading': family(values.headingFont, typographyDefaults.headingFont),
    '--weight-body': weight(values.bodyWeight, typographyDefaults.bodyWeight),
    '--weight-heading': weight(values.headingWeight, typographyDefaults.headingWeight),
    '--weight-emphasis': weight(values.emphasisWeight, typographyDefaults.emphasisWeight),
  } as CSSProperties
}
