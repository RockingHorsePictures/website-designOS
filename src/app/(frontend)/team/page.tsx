import { siteCMS } from '@/lib/site'
import { previewUser } from '@/lib/cms'
import { ContentImage } from '@/components/site/ContentView'
export const metadata = { title: 'Team' }
export default async function Team() {
  const { docs } = await (
    await siteCMS()
  ).find({
    collection: 'team-members',
    overrideAccess: false,
    user: await previewUser(),
    limit: 200,
    sort: 'order',
  })
  return (
    <section>
      <h1>Team</h1>
      <ul>
        {docs.map((p) => (
          <li key={p.id}>
            <h2>{p.name}</h2>
            <p>{p.role}</p>
            <ContentImage asset={p.portrait} />
            <p>{p.bio}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
