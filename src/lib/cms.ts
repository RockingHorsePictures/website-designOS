import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { draftMode, headers } from 'next/headers'
import type { ContentCollection } from './urls'

export const cms = () => getPayload({ config })
export const currentUser = cache(async () => {
  const payload = await cms()
  return (await payload.auth({ headers: await headers() })).user
})
export const previewUser = cache(async () => ((await draftMode()).isEnabled ? currentUser() : null))
export const findContent = cache(async (collection: ContentCollection, slug: string) => {
  const payload = await cms()
  const user = await previewUser()
  const result = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
    draft: Boolean(user),
    overrideAccess: false,
    user,
  })
  return result.docs[0] || null
})
