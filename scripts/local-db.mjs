import EmbeddedPostgres from 'embedded-postgres'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const databaseDir = path.resolve('.local/postgres')
mkdirSync(path.dirname(databaseDir), { recursive: true })
const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'designos',
  password: 'local-only',
  port: 54329,
  persistent: true,
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: console.error,
})
if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) await pg.initialise()
await pg.start()
const client = pg.getPgClient()
await client.connect()
const { rows } = await client.query("SELECT 1 FROM pg_database WHERE datname = 'designos'")
if (!rows.length) await pg.createDatabase('designos')
await client.end()
console.log('Local PostgreSQL ready on 127.0.0.1:54329. Keep this process running.')
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    await pg.stop()
    process.exit(0)
  })
setInterval(() => {}, 60000)
