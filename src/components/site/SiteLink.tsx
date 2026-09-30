'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'
import { prefixed } from '@/lib/locales'

export { prefixed, sitePrefix } from '@/lib/locales'
export function SiteLink({ href, ...props }: ComponentProps<typeof Link>) {
  const path = usePathname()
  return <Link {...props} href={typeof href === 'string' ? prefixed(href, path) : href} />
}
