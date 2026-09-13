import Link from 'next/link'

export type ProjectSummary = {
  id: number
  title: string
  slug: string
  summary?: string | null
  featured?: boolean | null
}
export function Intro({
  heading,
  body,
  style = 'plain',
}: {
  heading: string
  body: string
  style?: 'plain' | 'surface'
}) {
  return (
    <section className={`proof-section ${style}`}>
      <h2>{heading}</h2>
      <p>{body}</p>
    </section>
  )
}
export function CallToAction({
  heading,
  body,
  label,
  href,
}: {
  heading: string
  body: string
  label: string
  href: string
}) {
  return (
    <section className="proof-section">
      <h2>{heading}</h2>
      <p>{body}</p>
      <Link href={href}>{label}</Link>
    </section>
  )
}
export function SelectedProjects({
  heading,
  projects,
}: {
  heading: string
  projects: ProjectSummary[]
}) {
  return (
    <section className="proof-section">
      <h2>{heading}</h2>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <Link href={`/case-studies/${p.slug}`}>{p.title}</Link>
            <p>{p.summary}</p>
          </li>
        ))}
      </ul>
      {!projects.length && <p>No matching published case studies.</p>}
    </section>
  )
}
