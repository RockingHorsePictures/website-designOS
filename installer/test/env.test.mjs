import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEnv } from 'node:util'
import { envFileText, envLine } from '../workflow.mjs'

test('environment files round-trip values containing quotes, # and =', () => {
  const values = {
    A: 'ab"cd#x',
    B: "it's = fine",
    C: 'plain',
    D: 'postgresql://u:p@h/db?sslmode=require',
  }
  assert.deepEqual(parseEnv(envFileText(values)), values)
})

test('values that cannot be stored safely are refused', () => {
  assert.equal(envLine('line\nbreak'), null)
  assert.equal(envLine('all\'three"`'), null)
  assert.throws(() => envFileText({ BAD: 'x\ny' }), /cannot be stored safely/)
})
