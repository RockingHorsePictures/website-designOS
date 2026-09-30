// Vercel build: migrate this environment's own database, then build. Used by every Deploy Button
// and installer site. Set DESIGNOS_AUTO_MIGRATE=false to migrate by hand instead.
import { spawnSync } from 'node:child_process'
import '../src/lib/env-defaults.mjs'

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env, shell: false })
  if (result.status !== 0) process.exit(result.status || 1)
}
const vercel = process.env.VERCEL_ENV
if (vercel === 'preview' && process.env.DATABASE_ENV !== 'preview') {
  console.error(
    '\nCode previews need their own database. In Vercel → Storage → your Neon database, turn on preview branches, then add DESIGNOS_PREVIEW_DATA=branch to the Preview environment. Production is not affected.\n',
  )
  process.exit(1)
}
// The Design OS product repository shares a demo database between branches, so it only migrates
// when asked. Websites made from it migrate automatically.
const productRepo =
  process.env.VERCEL_GIT_REPO_OWNER === 'RockingHorsePictures' &&
  process.env.VERCEL_GIT_REPO_SLUG === 'website-designOS'
const migrate = productRepo
  ? process.env.DESIGNOS_AUTO_MIGRATE === 'true'
  : process.env.DESIGNOS_AUTO_MIGRATE !== 'false'
if (migrate && process.env.DATABASE_URL) {
  console.log(`Applying database migrations for ${process.env.DATABASE_ENV || 'this'} environment…`)
  run(process.execPath, ['node_modules/payload/bin.js', 'migrate'])
}
run(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'])
