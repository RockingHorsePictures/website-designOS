import { requireLocale } from '@/lib/site'
import { notFound } from 'next/navigation'
import {
  BlogIndex,
  blogCategories,
  blogMetadata,
  blogPosts,
  pageNumber,
} from '@/components/site/Blog'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> }
async function category(params: Props['params']) {
  const { slug } = await params
  return (await blogCategories()).find((c) => c.slug === slug) || null
}
export async function generateMetadata({ params, searchParams }: Props) {
  const found = await category(params)
  if (!found) return { title: 'Page not found', robots: { index: false } }
  const page = pageNumber((await searchParams).page)
  return blogMetadata(
    found.title,
    `/blog/category/${found.slug}`,
    page,
    (await blogPosts(found.id)).length,
  )
}
export default async function Page({ params, searchParams }: Props) {
  await requireLocale()
  const found = await category(params)
  if (!found) notFound()
  return (
    <BlogIndex
      title={found.title}
      path={`/blog/category/${found.slug}`}
      page={pageNumber((await searchParams).page)}
      category={found}
    />
  )
}
