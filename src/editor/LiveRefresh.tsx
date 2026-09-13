'use client'
import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
export function LiveRefresh() {
  const router = useRouter()
  return (
    <RefreshRouteOnSave
      refresh={router.refresh}
      serverURL={process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}
    />
  )
}
