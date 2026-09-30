'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'
import { defaultLocale, isLocale } from '@/lib/locales'

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
export function SiteLink({ href, ...props }: ComponentProps<typeof Link>) {
  const path = usePathname()
  return <Link {...props} href={typeof href === 'string' ? prefixed(href, path) : href} />
}
