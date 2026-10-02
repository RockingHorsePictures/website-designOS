'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useConfig, useDocumentInfo, usePreferences } from '@payloadcms/ui'

// Previous / Next on every edit screen, following the list the editor came from: its search,
// filters and sort. Unsaved changes still trigger Payload's "leave without saving" prompt.
const listKey = (slug: string) => `dos-list-${slug}`

// On a list view: remember its query so the edit screens can step through the same records.
export function ListMemory() {
  useEffect(() => {
    const slug = window.location.pathname.match(/\/collections\/([^/]+)\/?$/)?.[1]
    if (!slug) return
    try {
      sessionStorage.setItem(listKey(slug), window.location.search)
    } catch {}
  })
  return null
}

export function RecordNav() {
  const { id, collectionSlug } = useDocumentInfo()
  const { getEntityConfig, config } = useConfig()
  const { getPreference } = usePreferences()
  const [ids, setIds] = useState<(string | number)[] | null>(null)

  useEffect(() => {
    if (!collectionSlug || id === undefined || id === null) return
    let cancelled = false
    void (async () => {
      const collection = getEntityConfig({ collectionSlug })
      let saved = ''
      try {
        saved = sessionStorage.getItem(listKey(collectionSlug)) || ''
      } catch {}
      const list = new URLSearchParams(saved)
      const sort =
        list.get('sort') ||
        (await getPreference<{ sort?: string } | undefined>(`collection-${collectionSlug}`)
          .then((p) => p?.sort)
          .catch(() => undefined)) ||
        (typeof collection?.defaultSort === 'string' ? collection.defaultSort : undefined)
      const load = async (filtered: boolean) => {
        const query = new URLSearchParams()
        if (filtered) {
          for (const [key, value] of list) if (key.startsWith('where')) query.append(key, value)
          const search = list.get('search')
          if (search) {
            const fields = collection?.admin?.listSearchableFields?.length
              ? collection.admin.listSearchableFields
              : [collection?.admin?.useAsTitle || 'id']
            fields.forEach((field, i) =>
              query.append(`where[and][1000][or][${i}][${field}][like]`, search),
            )
          }
        }
        if (sort) query.set('sort', sort)
        query.set('depth', '0')
        query.set('pagination', 'false')
        query.set('select[id]', 'true')
        if (typeof collection?.versions === 'object' && collection.versions.drafts)
          query.set('draft', 'true')
        const res = await fetch(
          `${config.serverURL}${config.routes.api}/${collectionSlug}?${query}`,
          { credentials: 'include' },
        )
        if (!res.ok) return []
        return ((await res.json()) as { docs: { id: string | number }[] }).docs.map((d) => d.id)
      }
      let found = await load(true)
      // Opened from elsewhere, or outside the remembered filter: step through the whole list.
      if (
        !found.some((d) => String(d) === String(id)) &&
        (list.has('search') || saved.includes('where'))
      )
        found = await load(false)
      if (!cancelled) setIds(found)
    })()
    return () => {
      cancelled = true
    }
  }, [collectionSlug, id, getEntityConfig, getPreference, config.serverURL, config.routes.api])

  if (!ids || id === undefined || id === null) return null
  const at = ids.findIndex((d) => String(d) === String(id))
  if (at === -1 || ids.length < 2) return null
  const href = (target: string | number) =>
    `${config.routes.admin}/collections/${collectionSlug}/${target}`
  const prev = at > 0 ? ids[at - 1] : null
  const next = at < ids.length - 1 ? ids[at + 1] : null
  return (
    <nav className="dos-record-nav" aria-label="Move between records">
      {prev !== null ? (
        <Link className="dos-record-nav__link" href={href(prev)} prefetch={false} rel="prev">
          ‹ Previous
        </Link>
      ) : (
        <span className="dos-record-nav__link" aria-disabled="true">
          ‹ Previous
        </span>
      )}
      <span className="dos-record-nav__count">
        {at + 1} of {ids.length}
      </span>
      {next !== null ? (
        <Link className="dos-record-nav__link" href={href(next)} prefetch={false} rel="next">
          Next ›
        </Link>
      ) : (
        <span className="dos-record-nav__link" aria-disabled="true">
          Next ›
        </span>
      )}
    </nav>
  )
}
