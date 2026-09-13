import Link from 'next/link'
import { cms } from '@/lib/cms'
export async function ContentIndex({
  collection,
  title,
}: {
  collection: 'case-studies' | 'services'
  title: string
}) {
  const { docs } = await (
    await cms()
  ).find({ collection, overrideAccess: false, draft: false, limit: 100, sort: 'order' })
  return (
    <section>
      <h1>{title}</h1>
      <ul>
        {docs.map((doc) => (
          <li key={doc.id}>
            <Link href={`/${collection}/${doc.slug}`}>{doc.title}</Link>
            <p>{doc.summary}</p>
          </li>
        ))}
      </ul>
      {!docs.length && <p>No published content yet.</p>}
    </section>
  )
}
