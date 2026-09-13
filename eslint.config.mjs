import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: { '@next/next/no-html-link-for-pages': 'off' } },
  globalIgnores([
    '.next/**',
    '.cache/**',
    '.local/**',
    '.vercel/**',
    '.agents/**',
    'playwright-report/**',
    'test-results/**',
    'src/payload-types.ts',
    'src/migrations/**',
    'src/app/(payload)/admin/importMap.js',
    'next-env.d.ts',
  ]),
])
