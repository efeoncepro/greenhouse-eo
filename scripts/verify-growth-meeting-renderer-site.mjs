import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const siteDir = resolve(repoRoot, 'artifacts/public-renderers')
const manifest = JSON.parse(await readFile(resolve(siteDir, 'channels/stable.json'), 'utf8'))
const hash = value => createHash('sha256').update(value).digest('hex')

if (manifest.schema !== 'efeonce.public-renderer-release.v1') throw new Error('invalid manifest schema')
if (!/^[a-f0-9]{20}$/.test(manifest.releaseId)) throw new Error('invalid release id')

for (const asset of ['renderer', 'icons']) {
  const descriptor = manifest.assets?.[asset]
  const bytes = await readFile(resolve(siteDir, descriptor.path.replace(/^\//, '')))

  if (hash(bytes) !== descriptor.sha256) throw new Error(`${asset} hash mismatch`)
}

const loader = await readFile(resolve(siteDir, 'loader.js'), 'utf8')

if (!loader.includes("fetch(new URL('channels/stable.json'")) throw new Error('loader does not resolve stable channel')
if (!loader.includes('dataset.ghmIconRelease') || !loader.includes('dataset.ghmRendererRelease')) throw new Error('loader lacks atomic release markers')

console.log(`[renderer:meeting:site:verify] OK release=${manifest.releaseId}`)
