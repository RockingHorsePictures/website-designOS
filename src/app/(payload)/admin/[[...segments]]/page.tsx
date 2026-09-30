import config from '@payload-config'
import { redirect } from 'next/navigation'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<Record<string, string | string[]>>
}
export const generateMetadata = ({ params, searchParams }: Args) =>
  generatePageMetadata({ config, params, searchParams })
export default async function Page({ params, searchParams }: Args) {
  // New sites create their first administrator on the protected /setup page instead.
  if ((await params).segments?.[0] === 'create-first-user') redirect('/setup')
  return RootPage({ config, params, searchParams, importMap })
}
