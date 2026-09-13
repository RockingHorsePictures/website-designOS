import type { CSSProperties } from 'react'
// Neutral proof defaults; deliberately not a proposed company palette.
export const tokenDefaults = {
  canvas: '#ffffff',
  surface: '#f4f4f4',
  text: '#171717',
  muted: '#595959',
  accent: '#333333',
  highlight: '#eeeeee',
  border: '#b5b5b5',
  inverse: '#ffffff',
}
export type TokenName = keyof typeof tokenDefaults
export const validColor = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
export function tokenStyle(values: Partial<Record<TokenName, unknown>> = {}): CSSProperties {
  return Object.fromEntries(
    Object.entries(tokenDefaults).map(([k, fallback]) => [
      `--color-${k}`,
      validColor(values[k as TokenName]) ? values[k as TokenName] : fallback,
    ]),
  ) as CSSProperties
}
export const previewWidths = [
  { label: 'Mobile', name: 'mobile', width: 390, height: 844 },
  { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
  { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
]
