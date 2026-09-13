import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { spawn } from 'node:child_process'
const [file, program, ...args] = process.argv.slice(2)
if (!file || !program)
  throw new Error('Usage: node scripts/with-env.mjs <env-file> <node-script> [args]')
const env = { ...process.env, ...parseEnv(readFileSync(file, 'utf8')) }
const child = spawn(process.execPath, [program, ...args], { env, stdio: 'inherit' })
child.on('exit', (code) => process.exit(code || 0))
