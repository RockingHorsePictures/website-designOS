import { ContentIndex, indexMetadata } from '@/components/site/ContentIndex'
export const generateMetadata = () => indexMetadata('case-studies')
export default function Page() {
  return <ContentIndex collection="case-studies" title="Case studies" />
}
