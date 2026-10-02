// Lógica pura del archivo de ai-generations, sin red ni disco. `pnpm ai-gen:test`.
//
// 🔴 Las rutas de prueba se arman con `${AG}/…` a propósito: escritas literales, ESTE archivo las citaría
// y `ai-gen:protected` las protegería (el código de `scripts/**` protege lo que cita).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  compareReadback,
  crc32c,
  DAY_MS,
  deriveProtected,
  extractCitedFolders,
  folderOfRel,
  gsUrl,
  mergeArtifactFiles,
  missingRemote,
  normalizeRemote,
  normalizeTarget,
  parseGitGrep,
  selectCandidates,
  snapshotDiff
} from './lib.mjs'
import { buildArtifactsManifest, isBinary, resolveArchiveBucket } from '../media/ai-generation-artifacts.mjs'

const AG = 'ai-generations'

test('extractCitedFolders: exactas, prefijos por interpolación y sin carpetas ocultas', () => {
  const text = [
    `const a = '${AG}/2026-09-21_nexa-injerto/out/a.png'`,
    `const b = path.join(ROOT, '${AG}/_identidad-nexa')`,
    `const c = \`${AG}/2026-09-20_palancas-\${r}\``,
    `const d = '${AG}/.cta-prueba-1/x.png'`,
    `const e = '${AG}/**'`,
    `const f = 'scripts/${AG}/archive-manifest.json'`
  ].join('\n')

  const { exact, prefixes } = extractCitedFolders(text)

  assert.deepEqual([...exact].sort(), ['2026-09-21_nexa-injerto', '_identidad-nexa'])
  assert.deepEqual([...prefixes], ['2026-09-20_palancas-'])
})

test('folderOfRel y normalizeTarget aceptan las tres formas y rechazan salir del árbol', () => {
  assert.equal(folderOfRel(`${AG}/2026-09-17_polo-efeonce/final/a.png`), '2026-09-17_polo-efeonce')
  assert.equal(folderOfRel('docs/x.md'), null)

  assert.deepEqual(normalizeTarget(`${AG}/2026-09-21_nexa-injerto`), { folder: '2026-09-21_nexa-injerto', sub: '' })
  assert.deepEqual(normalizeTarget('2026-09-21_nexa-injerto/out/a.png/'), {
    folder: '2026-09-21_nexa-injerto',
    sub: 'out/a.png'
  })
  assert.deepEqual(normalizeTarget(`/repo/${AG}/x/y.png`, '/repo'), { folder: 'x', sub: 'y.png' })
  assert.throws(() => normalizeTarget(`${AG}/../etc`))
  assert.throws(() => normalizeTarget(`${AG}/.oculta`))
})

test('gsUrl conserva la ruta relativa al repo', () => {
  assert.equal(gsUrl('bucket-x', `${AG}/c/sub/a.png`), `gs://bucket-x/${AG}/c/sub/a.png`)
})

test('deriveProtected une lock, recetas y código, con motivos', () => {
  const p = deriveProtected({
    lockPaths: [`${AG}/2026-09-17_polo-efeonce/final/a.png`, `${AG}/_identidad-nexa/1-anclas/b.png`],
    recipesText: JSON.stringify({ plate: `${AG}/2026-09-26_deck-nexa/plate.png` }),
    codeHits: [
      { file: 'src/a.ts', text: `'${AG}/2026-09-17_polo-efeonce/x.png'` },
      { file: 'scripts/b.mjs', text: `\`${AG}/2026-09-20_palancas-\${r}\`` }
    ],
    folders: ['2026-09-20_palancas-podcast', '2026-09-20_palancas-nuevas', '2026-09-20_otra']
  })

  assert.deepEqual(
    [...p.keys()],
    [
      '_identidad-nexa',
      '2026-09-17_polo-efeonce',
      '2026-09-20_palancas-nuevas',
      '2026-09-20_palancas-podcast',
      '2026-09-26_deck-nexa'
    ]
  )
  assert.equal(p.get('2026-09-17_polo-efeonce').length, 2)
  assert.match(p.get('2026-09-26_deck-nexa')[0], /recetas/)
  assert.match(p.get('2026-09-20_palancas-podcast')[0], /prefijo/)
})

test('parseGitGrep separa archivo y línea, y respeta exclusiones', () => {
  const out = [`src/x.ts:const y = '${AG}/vivo/a.png'`, `scripts/z.mjs:'${AG}/otro'`, ''].join('\n')

  assert.deepEqual(parseGitGrep(out, ['scripts/z.mjs']), [{ file: 'src/x.ts', text: `const y = '${AG}/vivo/a.png'` }])
})

test('selectCandidates filtra ocultas, protegidas, recientes y sin binarios', () => {
  const now = Date.UTC(2026, 9, 1)
  const old = now - 30 * DAY_MS

  const folders = [
    { name: '.tmp', binaries: 3, binaryBytes: 1, newestMtimeMs: old },
    { name: 'protegida', binaries: 3, binaryBytes: 1, newestMtimeMs: old },
    { name: 'reciente', binaries: 3, binaryBytes: 1, newestMtimeMs: now - 2 * DAY_MS },
    { name: 'ya-archivada', binaries: 0, binaryBytes: 0, newestMtimeMs: old },
    { name: 'vieja', binaries: 3, binaryBytes: 10, newestMtimeMs: now - 4 * DAY_MS }
  ]

  const { candidates, skipped } = selectCandidates({ folders, protectedSet: new Set(['protegida']), now, minAgeDays: 3 })

  assert.deepEqual(
    candidates.map(c => c.name),
    ['vieja']
  )
  assert.deepEqual(
    skipped.map(s => s.reason),
    ['oculta', 'protegida', 'modificada hace < 3 días', 'sin binarios en disco']
  )
})

test('crc32c es el Castagnoli de GCS (vector estándar)', () => {
  assert.equal(crc32c(Buffer.from('123456789')), 0xe3069283)
  assert.equal(crc32c(Buffer.alloc(0)), 0)
})

test('normalizeRemote pasa md5 a hex y crc32c a entero', () => {
  const crc = Buffer.alloc(4)

  crc.writeUInt32BE(0xe3069283)

  const r = normalizeRemote({
    name: `${AG}/c/a.png`,
    size: '3',
    md5_hash: Buffer.from('00ff', 'hex').toString('base64'),
    crc32c_hash: crc.toString('base64')
  })

  assert.deepEqual(r, { name: `${AG}/c/a.png`, bytes: 3, md5: '00ff', crc32c: 0xe3069283 })
  assert.equal(normalizeRemote({ name: 'x', size: 1 }).md5, null)
})

test('compareReadback exige inventario, tamaño y hash del servidor (md5 o crc32c)', () => {
  const P = `${AG}/c`

  const local = new Map([
    ['ok.png', { sha256: 's1', md5: 'm1', bytes: 10 }],
    ['falta.png', { sha256: 's2', md5: 'm2', bytes: 10 }],
    ['tam.png', { sha256: 's3', md5: 'm3', bytes: 10 }],
    ['md5.png', { sha256: 's4', md5: 'm4', bytes: 10 }],
    ['compuesto-ok.png', { sha256: 's5', md5: 'm5', bytes: 10, crc32c: 7 }],
    ['compuesto-sin-crc.png', { sha256: 's6', md5: 'm6', bytes: 10 }],
    ['inventario.png', { sha256: 's7', md5: 'm7', bytes: 10 }]
  ])

  const manifest = new Map(
    [...local].map(([rel, l]) => [rel, { sha256: rel === 'inventario.png' ? 'otro' : l.sha256, sizeBytes: l.bytes }])
  )

  const remote = [
    { name: `${P}/ok.png`, bytes: 10, md5: 'm1', crc32c: 1 },
    { name: `${P}/tam.png`, bytes: 9, md5: 'm3', crc32c: 1 },
    { name: `${P}/md5.png`, bytes: 10, md5: 'otro', crc32c: 1 },
    { name: `${P}/compuesto-ok.png`, bytes: 10, md5: null, crc32c: 7 },
    { name: `${P}/compuesto-sin-crc.png`, bytes: 10, md5: null, crc32c: 9 },
    { name: `${P}/inventario.png`, bytes: 10, md5: 'm7', crc32c: 1 }
  ]

  const r = compareReadback({ local, remote, manifest, objectPrefix: P })

  assert.equal(r.ok, false)
  assert.deepEqual(
    r.problems.map(p => p.split(':')[0]).sort(),
    ['compuesto-sin-crc.png', 'falta.png', 'inventario.png', 'md5.png', 'tam.png']
  )

  const solo = new Map([...local].filter(([k]) => k === 'ok.png' || k === 'compuesto-ok.png'))

  assert.ok(compareReadback({ local: solo, remote, manifest, objectPrefix: P }).ok)
})

test('missingRemote sólo pide sincronizar lo ausente o distinto', () => {
  const P = `${AG}/c`

  const local = new Map([
    ['a.png', { md5: 'm1', bytes: 1 }],
    ['b.png', { md5: 'm2', bytes: 1 }],
    ['c.png', { md5: 'm3', bytes: 1 }],
    ['d.png', { md5: 'm4', bytes: 1 }]
  ])

  const remote = [
    { name: `${P}/a.png`, md5: 'm1', bytes: 1 },
    { name: `${P}/b.png`, md5: 'viejo', bytes: 1 },
    { name: `${P}/d.png`, md5: null, bytes: 1 }
  ]

  assert.deepEqual(
    missingRemote(local, remote, P).map(([k]) => k),
    ['b.png', 'c.png']
  )
})

test('mergeArtifactFiles conserva lo ya archivado y deja ganar lo actual', () => {
  const prev = [
    { path: 'viejo.png', sizeBytes: 5, sha256: 'v', gsUri: 'gs://b/v' },
    { path: 'z.png', sizeBytes: 1, sha256: 'antes', gsUri: 'gs://b/z' }
  ]

  const current = [
    { path: 'z.png', sizeBytes: 2, sha256: 'ahora', gsUri: 'gs://b/z' },
    { path: 'nuevo.png', sizeBytes: 7, sha256: 'n', gsUri: 'gs://b/n' }
  ]

  assert.deepEqual(
    mergeArtifactFiles(prev, current).map(f => `${f.path}:${f.sha256}`),
    ['nuevo.png:n', 'viejo.png:v', 'z.png:ahora']
  )
  assert.deepEqual(mergeArtifactFiles(undefined, current).length, 2)
})

test('snapshotDiff detecta cambios, bajas y altas (la acción debe fallar si el estado se movió)', () => {
  const before = [
    { rel: 'a', bytes: 1, mtimeMs: 1 },
    { rel: 'b', bytes: 1, mtimeMs: 1 }
  ]

  assert.deepEqual(snapshotDiff(before, before), [])
  assert.deepEqual(
    snapshotDiff(before, [
      { rel: 'a', bytes: 1, mtimeMs: 2 },
      { rel: 'c', bytes: 1, mtimeMs: 1 }
    ]),
    ['a: cambió', 'b: desapareció', 'c: archivo nuevo']
  )
})

test('primitive compartido: inventario v1 con el mismo orden de claves y bucket por env', () => {
  const m = buildArtifactsManifest({
    run: `${AG}/c`,
    bucket: 'b',
    objectPrefix: `${AG}/c`,
    files: [{ path: 'a.png', sizeBytes: 2, sha256: 's', gsUri: `gs://b/${AG}/c/a.png` }],
    generatedAt: 'T'
  })

  assert.deepEqual(Object.keys(m), ['schema', 'generatedAt', 'run', 'bucket', 'prefix', 'totalBytes', 'fileCount', 'files'])
  assert.equal(m.schema, 'greenhouse.aiGenerationArtifacts.v1')
  assert.equal(m.totalBytes, 2)
  assert.equal(resolveArchiveBucket({ GREENHOUSE_AI_GENERATIONS_BUCKET: 'otro' }), 'otro')
  assert.ok(isBinary('x/Y.PNG') && !isBinary('README.md') && !isBinary('artifacts.remote.json'))
})
