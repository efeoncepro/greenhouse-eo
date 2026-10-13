#!/usr/bin/env node
/** Verify vendored bytes from the local provenance manifest; no network or sibling repo needed. */
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const args = process.argv.slice(2)
const index = args.indexOf('--dir')

const directory =
  index >= 0 ? path.resolve(args[index + 1]) : fileURLToPath(new URL('../../src/lib/axis/aeo-xray/', import.meta.url))

const files = [
  'aeo-xray-experience.js',
  'aeo-xray-experience.d.ts',
  'aeo-xray.js',
  'aeo-xray.d.ts',
  'aeo-xray-tokens.js',
  'aeo-xray-tokens.d.ts',
  'tokens.json'
]

const manifest = JSON.parse(await readFile(path.join(directory, 'provenance.json'), 'utf8'))

if (
  manifest.schema !== 'axis.aeo-xray-distribution.v1' ||
  manifest.source !== 'axis-design-system' ||
  manifest.contract !== 'efeonce.aeo-xray' ||
  !['0.1.0', '0.2.0'].includes(manifest.version)
)
  throw new Error('Unsupported X-Ray distribution provenance')
if (JSON.stringify(Object.keys(manifest.files ?? {}).sort()) !== JSON.stringify([...files].sort()))
  throw new Error('X-Ray distribution file inventory mismatch')

for (const filename of files) {
  const expected = manifest.files[filename]

  if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error(`Invalid digest: ${filename}`)

  const bytes = await readFile(path.join(directory, filename))

  if (/\bfrom\s+["']@efeoncepro\//.test(bytes.toString('utf8')))
    throw new Error(`X-Ray distribution external import: ${filename}`)

  const actual = createHash('sha256')
    .update(await readFile(path.join(directory, filename)))
    .digest('hex')

  if (actual !== expected) throw new Error(`X-Ray distribution drift: ${filename}`)
}

console.log(`X-Ray distribution verified: ${files.length} files, ${manifest.contract}@${manifest.version}`)
