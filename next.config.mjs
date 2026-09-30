import './src/lib/env-defaults.mjs'
import { withPayload } from '@payloadcms/next/withPayload'

export default withPayload({
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Baseline policy that never blocks Next.js inline scripts; sites can tighten it.
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          ...(process.env.SITE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
            : []),
          ...(process.env.SITE_ENV !== 'production'
            ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]
            : []),
        ],
      },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ]
  },
})
