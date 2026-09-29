import { ContentIndex, indexMetadata } from '@/components/site/ContentIndex'
export const generateMetadata = () => indexMetadata('services')
export default function Page() {
  return <ContentIndex collection="services" title="Services" />
}
