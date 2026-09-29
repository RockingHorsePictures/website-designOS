// Section registry tools for AI and developers.
//   npm run sections -- catalog              JSON description (props schema) of every section
//   npm run sections -- validate page.json   validate a composition and run content checks
import { readFileSync } from 'node:fs'
import { compositionSchema, sectionCatalog } from '../src/editor/registry/schema'
import { auditContent } from '../src/lib/quality'

const [command, file] = process.argv.slice(2)
if (command === 'catalog') console.log(JSON.stringify(sectionCatalog(), null, 2))
else if (command === 'validate' && file) {
  const input = JSON.parse(readFileSync(file, 'utf8'))
  const composition = input.composition ?? input
  const parsed = compositionSchema.safeParse(composition)
  const findings = parsed.success
    ? auditContent({ title: 'x', slug: 'x', summary: 'x'.repeat(60), composition }).filter(
        (f) => f.field === 'composition' || f.field === 'evidence',
      )
    : []
  console.log(
    JSON.stringify(
      {
        valid: parsed.success,
        errors: parsed.success
          ? []
          : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        findings,
      },
      null,
      2,
    ),
  )
  process.exitCode = parsed.success ? 0 : 1
} else {
  console.error('Use: npm run sections -- catalog | validate <composition.json>')
  process.exitCode = 1
}
