// Languages a site can publish in. The database stores one enum of these codes, so adding a code
// here needs a migration; turning languages on or off per site (Site Settings) does not.
export const supportedLocales = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'sv', label: 'Svenska' },
  { code: 'da', label: 'Dansk' },
  { code: 'nb', label: 'Norsk bokmål' },
  { code: 'fi', label: 'Suomi' },
  { code: 'pl', label: 'Polski' },
  { code: 'cs', label: 'Čeština' },
  { code: 'el', label: 'Ελληνικά' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ru', label: 'Русский' },
  { code: 'uk', label: 'Українська' },
  { code: 'ar', label: 'العربية' },
  { code: 'he', label: 'עברית' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ga', label: 'Gaeilge' },
  { code: 'cy', label: 'Cymraeg' },
] as const
export type LocaleCode = (typeof supportedLocales)[number]['code']
export const localeCodes = supportedLocales.map((l) => l.code) as LocaleCode[]
export const rtlLocales: string[] = ['ar', 'he']
// The storage language for existing content. Fixed per site once content exists.
export const defaultLocale = (
  localeCodes.includes(process.env.DESIGNOS_DEFAULT_LOCALE as LocaleCode)
    ? process.env.DESIGNOS_DEFAULT_LOCALE
    : 'en'
) as LocaleCode
export const isLocale = (value: unknown): value is LocaleCode =>
  localeCodes.includes(value as LocaleCode)
export const localeLabel = (code: string) =>
  supportedLocales.find((l) => l.code === code)?.label || code

// Enabled languages from Site Settings: always the default first, then additional ones.
export function enabledLocales(settings: { languages?: unknown } | null | undefined) {
  const extra = Array.isArray(settings?.languages)
    ? (settings.languages as unknown[]).filter(isLocale)
    : []
  return [defaultLocale, ...extra.filter((l) => l !== defaultLocale)] as LocaleCode[]
}
// Path prefix for a locale: the default language has none (/about), others do (/fr/about).
export function localePath(path: string, locale: string | null | undefined) {
  if (!locale || locale === defaultLocale) return path
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}
// Splits "/fr/about" into ["fr", "/about"]; paths without a known prefix use the default.
export function splitLocale(path: string): [LocaleCode, string] {
  const first = path.split('/')[1]
  if (isLocale(first) && first !== defaultLocale)
    return [first, path.slice(first.length + 1) || '/']
  return [defaultLocale, path]
}
// Internal links stay inside the current channel (/preview, /workspace-preview) and language
// (/fr). Editors write plain paths such as /about; this adds the prefixes.
export function sitePrefix(path: string) {
  const channel = path.startsWith('/workspace-preview')
    ? '/workspace-preview'
    : path.startsWith('/preview')
      ? '/preview'
      : ''
  const first = path.slice(channel.length).split('/')[1]
  const locale = isLocale(first) && first !== defaultLocale ? `/${first}` : ''
  return { channel, locale }
}
export function prefixed(href: string, path: string) {
  if (!/^\/(?!\/)/.test(href) || /^\/(admin|api|editor|preview|workspace-preview)(\/|$)/.test(href))
    return href
  const { channel, locale } = sitePrefix(path)
  const target = `${locale}${href === '/' && locale ? '' : href}`
  return `${channel}${channel && target === '/' ? '' : target}` || '/'
}
