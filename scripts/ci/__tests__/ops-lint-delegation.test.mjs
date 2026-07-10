import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'scripts/ci/ops-lint.mjs'), 'utf8')

assert.match(source, /scripts\/ci\/task-lint\.mjs/)
assert.equal(source.includes('modular-placement-contract'), false)

console.log('  ✓ ops:lint delegates TASK enforcement to task-lint without duplicating modular placement rules')
console.log('\n[ops-lint-delegation.test] 1/1 passed.')
