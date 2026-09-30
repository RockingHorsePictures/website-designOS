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
const databaseURL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (vercel === 'preview' && databaseURL) {
  const { isProductionDatabase, withDatabase } = await import('./database-identity.mjs')
  if (await withDatabase(databaseURL, (client) => isProductionDatabase(databaseURL, client))) {
    console.error(
      '\nThis code preview is connected to your live database, so it has stopped before changing anything. In Vercel → Storage → your Neon database → Projects → ⋮ → Update Project Connection, tick Preview under "Create Database Branch For Deployment", save, then redeploy this preview. (Or remove DESIGNOS_PREVIEW_DATA from the Preview environment.) Your live site is not affected.\n',
    )
    process.exit(1)
  }
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
// Remember which database server is live, so previews can prove they are not using it.
if (vercel === 'production' && process.env.DATABASE_ENV === 'production' && databaseURL) {
  const { recordProductionDatabase, withDatabase } = await import('./database-identity.mjs')
  await withDatabase(databaseURL, (client) => recordProductionDatabase(databaseURL, client))
}
run(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'])
