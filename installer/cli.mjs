#!/usr/bin/env node
import { startWizard } from './server.mjs'
if (Number(process.versions.node.split('.')[0]) < 22)
  throw new Error('Install Node.js 22 or newer, then run this command again.')
await startWizard({ openBrowser: !process.argv.includes('--no-open') })
