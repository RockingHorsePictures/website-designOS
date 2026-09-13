import { siteCMS } from '@/lib/site'
import { previewUser } from '@/lib/cms'
import { SiteLink as Link } from '@/components/site/SiteLink'
export async function ContentIndex({
  collection,
  title,
}: {
  collection: 'case-studies' | 'services'
  title: string
}) {
  const { docs } = await (
    await siteCMS()
  ).find({
    collection,
    overrideAccess: false,
    user: await previewUser(),
    draft: Boolean(await previewUser()),
    limit: 100,
    sort: 'order',
  })
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
