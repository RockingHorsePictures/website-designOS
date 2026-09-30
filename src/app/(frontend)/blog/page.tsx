import { requireLocale } from '@/lib/site'
import { BlogIndex, blogMetadata, blogPosts, pageNumber } from '@/components/site/Blog'

type Props = { searchParams: Promise<{ page?: string }> }
export async function generateMetadata({ searchParams }: Props) {
  const page = pageNumber((await searchParams).page)
  return blogMetadata('Blog', '/blog', page, (await blogPosts()).length)
}
export default async function Page({ searchParams }: Props) {
  await requireLocale()
  return <BlogIndex title="Blog" path="/blog" page={pageNumber((await searchParams).page)} />
}
