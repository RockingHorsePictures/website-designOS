'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'
export function SiteLink({ href, ...props }: ComponentProps<typeof Link>) {
  const path = usePathname()
  const prefix = path.startsWith('/workspace-preview')
    ? '/workspace-preview'
    : path.startsWith('/preview')
      ? '/preview'
      : ''
  const url =
    typeof href === 'string' &&
    prefix &&
    /^\/(?!\/)/.test(href) &&
    !/^\/(admin|api|editor|preview|workspace-preview)(\/|$)/.test(href)
      ? `${prefix}${href === '/' ? '' : href}`
      : href
  return <Link {...props} href={url} />
}
