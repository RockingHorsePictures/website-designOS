import { customFontCSS, type TypographyValues } from './typography'

export function CustomFonts({ theme }: { theme: TypographyValues }) {
  const css = customFontCSS(theme)
  return css ? <style>{css}</style> : null
}
