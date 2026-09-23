import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import {
  analyzeFsSource,
  applyAllowlist,
  compileDenylist,
  discoverEntrypoints,
  globToRegExp,
  isAppEntrypoint,
  matchDenylist,
  packageNameFromSpecifier,
  packageNode,
  runReachabilityGate,
  validateAllowlist
} from './vercel-function-reachability-gate.mjs'

const writeFile = (root, rel, content) => {
  const abs = join(root, rel)

  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
}

// ───────────── Entradas ─────────────

test('isAppEntrypoint reconoce los archivos especiales del App Router', () => {
  for (const file of [
    'src/app/api/x/route.ts',
    'src/app/(dashboard)/admin/page.tsx',
    'src/app/layout.tsx',
    'src/app/(dashboard)/error.tsx',
    'src/app/global-error.tsx',
    'src/app/admin/loading.tsx',
    'src/app/not-found.tsx',
    'src/app/icon.tsx',
    'src/app/blog/opengraph-image2.tsx',
    'src/app/sitemap.ts',
    'src/app/robots.ts'
  ]) {
    assert.equal(isAppEntrypoint(file), true, file)
  }
})

test('isAppEntrypoint descarta carpetas privadas, tests, assets estáticos y archivos comunes', () => {
  for (const file of [
    'src/app/api/_private/route.ts', // carpeta privada: Next no la enruta
    'src/app/api/x/__tests__/route.test.ts',
    'src/app/api/x/route.test.ts',
    'src/app/icon.svg', // metadata estática, no es función
    'src/app/apple-icon.png',
    'src/app/admin/page-header.tsx',
    'src/lib/api/route.ts', // fuera de src/app
    'src/app/types.d.ts'
  ]) {
    assert.equal(isAppEntrypoint(file), false, file)
  }
})

test('discoverEntrypoints suma proxy e instrumentation y excluye instrumentation-client', () => {
  const root = mkdtempSync(join(tmpdir(), 'reach-entries-'))

  try {
    writeFile(root, 'src/app/api/a/route.ts', 'export const GET = () => new Response()')
    writeFile(root, 'src/app/page.tsx', 'export default function Page() { return null }')
    writeFile(root, 'src/app/components/Card.tsx', 'export const Card = () => null')
    writeFile(root, 'src/proxy.ts', 'export const proxy = () => null')
    writeFile(root, 'src/instrumentation.ts', 'export const register = () => null')
    writeFile(root, 'src/instrumentation-client.ts', 'export {}')

    assert.deepEqual(discoverEntrypoints(root), [
      'src/app/api/a/route.ts',
      'src/app/page.tsx',
      'src/instrumentation.ts',
      'src/proxy.ts'
    ])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

// ───────────── Denylist ─────────────

test('globToRegExp soporta *, ** y llaves', () => {
  const composer = globToRegExp('src/lib/artifact-composer/{index,render,compose}.ts')

  assert.equal(composer.test('src/lib/artifact-composer/index.ts'), true)
  assert.equal(composer.test('src/lib/artifact-composer/render.ts'), true)
  assert.equal(composer.test('src/lib/artifact-composer/paginate.ts'), false)
  assert.equal(composer.test('src/lib/artifact-composer/index.tsx'), false)

  const catalogs = globToRegExp('src/lib/artifact-composer/catalogs/**')

  assert.equal(catalogs.test('src/lib/artifact-composer/catalogs/insights-report/index.ts'), true)
  assert.equal(catalogs.test('src/lib/artifact-composer/catalogs-legacy/index.ts'), false)

  assert.equal(globToRegExp('services/**').test('services/ops-worker/server.ts'), true)
  assert.equal(globToRegExp('src/*.ts').test('src/lib/a.ts'), false, '* no cruza directorios')
  assert.equal(globToRegExp('src/**/a.ts').test('src/a.ts'), true, '**/ admite cero directorios')
})

test('matchDenylist distingue paquetes por nombre exacto y archivos por glob', () => {
  const compiled = compileDenylist([
    { kind: 'package', match: 'playwright' },
    { kind: 'package', match: '@sparticuz/chromium' },
    { kind: 'file', match: 'scripts/**' }
  ])

  assert.equal(matchDenylist(packageNode('playwright'), compiled)?.match, 'playwright')
  assert.equal(matchDenylist(packageNode('playwright-extra'), compiled), null)
  assert.equal(matchDenylist(packageNode('@sparticuz/chromium'), compiled)?.match, '@sparticuz/chromium')
  assert.equal(matchDenylist('scripts/ci/x.mjs', compiled)?.match, 'scripts/**')
  assert.equal(matchDenylist('src/lib/scripts/x.ts', compiled), null)
})

test('packageNameFromSpecifier reduce subpaths al nombre del paquete', () => {
  assert.equal(packageNameFromSpecifier('@playwright/test/reporter'), '@playwright/test')
  assert.equal(packageNameFromSpecifier('pdf-lib/cjs/api'), 'pdf-lib')
  assert.equal(packageNameFromSpecifier('node:fs/promises'), 'node:fs/promises')
})

// ───────────── Heurística de filesystem ─────────────

test('analyzeFsSource: rutas literales completas no son hallazgo', () => {
  const sources = [
    `import path from 'node:path'\nconst LOGO = path.join(process.cwd(), 'public/branding/logo-full.png')`,
    'const logoPath = `${process.cwd()}/public/branding/logo-full.png`',
    `import { resolve } from 'node:path'\nconst FONT_DIR = resolve(process.cwd(), 'src/assets/fonts')\nexport const f = () => resolve(FONT_DIR, 'Geist-Regular.ttf')`,
    `import { resolve } from 'node:path'\nconst REL = 'artifacts/results.json'\nexport const p = () => resolve(process.cwd(), REL)`,
    // sin ancla de runtime: el trazado no puede ensancharse
    `import { readFileSync } from 'node:fs'\nexport const read = (filePath: string) => readFileSync(filePath, 'utf8')`,
    `import os from 'node:os'\nimport path from 'node:path'\nexport const tmp = (name: string) => path.join(os.tmpdir(), name)`,
    // .join de un arreglo no es path.join
    'export const label = (items: string[]) => [process.cwd(), ...items].join(", ")',
    // import type de fs no es un binding de runtime
    `import type { PathLike } from 'node:fs'\nexport const cwd = process.cwd()`
  ]

  for (const source of sources) assert.deepEqual(analyzeFsSource(source, 'x.ts'), [], source)
})

test('analyzeFsSource: ancla + segmento variable es hallazgo (fs, path y URL)', () => {
  const assetHelper = analyzeFsSource(
    `import { resolve } from 'node:path'\nconst asset = (file: string): string => resolve(process.cwd(), 'public', file)`,
    'AiVisibilityReportPdf.tsx'
  )

  assert.equal(assetHelper.length, 1)
  assert.equal(assetHelper[0].line, 2)
  assert.equal(assetHelper[0].kind, 'path')

  const optionsRoot = analyzeFsSource(
    [
      `import { readFileSync } from 'node:fs'`,
      `import { join } from 'node:path'`,
      `export const load = (options: { root?: string }, entry: { sourcePath: string }) => {`,
      `  const root = options.root ?? process.cwd()`,
      `  return readFileSync(join(root, entry.sourcePath), 'utf8')`,
      `}`
    ].join('\n'),
    'skill-catalog-fs.ts'
  )

  assert.deepEqual(
    optionsRoot.map(hit => hit.line),
    [5]
  )

  const existsTemplate = analyzeFsSource(
    "import { existsSync } from 'node:fs'\nimport { join } from 'node:path'\nexport const has = (clean: string, ext: string) => existsSync(join(process.cwd(), 'src', 'app', clean, `page.${ext}`))",
    'q.ts'
  )

  assert.equal(existsTemplate.length, 1, 'fs + path en la misma línea = un hallazgo')

  const staticDirThenVariable = analyzeFsSource(
    [
      `import { writeFile } from 'node:fs/promises'`,
      `import { join } from 'node:path'`,
      `const OUT_DIR = join(process.cwd(), 'public', 'images', 'generated')`,
      `export const save = (filename: string) => join(OUT_DIR, filename)`
    ].join('\n'),
    'image-generator.ts'
  )

  assert.deepEqual(
    staticDirThenVariable.map(hit => hit.line),
    [4]
  )

  const importMetaUrl = analyzeFsSource(
    `import fs from 'node:fs'\nexport const read = (name: string) => fs.readFileSync(new URL('./data/' + name, import.meta.url))`,
    'm.ts'
  )

  assert.equal(importMetaUrl.length, 1)

  const dirnameAnchor = analyzeFsSource(
    [
      `import { promises as fsp } from 'node:fs'`,
      `import path from 'node:path'`,
      `import { fileURLToPath } from 'node:url'`,
      `const HERE = path.dirname(fileURLToPath(import.meta.url))`,
      `export const list = (sub: string) => fsp.readdir(path.join(HERE, sub))`
    ].join('\n'),
    'n.ts'
  )

  assert.deepEqual(
    dirnameAnchor.map(hit => hit.line),
    [5]
  )

  const anchorFunction = analyzeFsSource(
    [
      `import * as fs from 'fs'`,
      `import { join } from 'path'`,
      `const repoRoot = (): string => process.cwd()`,
      `export const read = (name: string) => fs.readFileSync(join(repoRoot(), 'docs', name))`
    ].join('\n'),
    'r.ts'
  )

  assert.deepEqual(
    anchorFunction.map(hit => hit.line),
    [4]
  )
})

// ───────────── Allowlist ─────────────

test('validateAllowlist exige file, reason y since, y rechaza duplicados', () => {
  assert.deepEqual(validateAllowlist({ fsDynamicPath: [] }), [])
  assert.deepEqual(
    validateAllowlist({ fsDynamicPath: [{ file: 'src/a.ts', reason: 'medido: 0,1 MB bajo el límite', since: '2026-09-22' }] }),
    []
  )

  const errors = validateAllowlist({
    fsDynamicPath: [
      { file: 'src/a.ts', reason: 'corta', since: 'ayer' },
      { file: 'src/a.ts', reason: 'una razón suficientemente larga', since: '2026-09-22' }
    ]
  })

  assert.equal(errors.length, 3)
  assert.match(validateAllowlist({}).join(), /fsDynamicPath/)
})

test('applyAllowlist: ratchet con hallazgos nuevos, aceptados y entradas obsoletas', () => {
  const findings = new Map([
    ['src/nuevo.ts', [{ line: 3 }]],
    ['src/aceptado.ts', [{ line: 7 }]]
  ])

  const result = applyAllowlist({
    findings,
    allowlistEntries: [
      { file: 'src/aceptado.ts', reason: 'medido', since: '2026-09-22' },
      { file: 'src/ya-arreglado.ts', reason: 'medido', since: '2026-09-22' }
    ],
    staleReason: file => `sin hallazgos en ${file}`
  })

  assert.deepEqual(
    result.fresh.map(item => item.file),
    ['src/nuevo.ts']
  )
  assert.deepEqual(
    result.allowlisted.map(item => item.file),
    ['src/aceptado.ts']
  )
  assert.deepEqual(
    result.stale.map(item => [item.file, item.why]),
    [['src/ya-arreglado.ts', 'sin hallazgos en src/ya-arreglado.ts']]
  )
})

// ───────────── Integración (esbuild real sobre un árbol de prueba) ─────────────

const buildFixture = root => {
  writeFile(
    root,
    'tsconfig.json',
    JSON.stringify({ compilerOptions: { jsx: 'react-jsx', paths: { '@/*': ['./src/*'] } } })
  )

  // Barrel pesado: re-exporta el motor, que importa `playwright` como VALOR.
  writeFile(root, 'src/lib/heavy/index.ts', `export { heavy } from './render'\nexport type Heavy = { id: string }\n`)
  writeFile(root, 'src/lib/heavy/render.ts', `import { chromium } from 'playwright'\nexport const heavy = () => chromium\n`)

  // Módulo liviano con un import SÓLO de tipo inline: esbuild lo elimina y no debe contar.
  writeFile(
    root,
    'src/lib/light.ts',
    `import { type Page } from 'playwright'\nexport const title = (page: Page | null) => String(page)\n`
  )

  writeFile(
    root,
    'src/app/api/good/route.ts',
    `import type { Heavy } from '@/lib/heavy'\nimport { title } from '@/lib/light'\n\nexport const GET = (): Response => new Response(title(null) + String(null as Heavy | null))\n`
  )
}

const FIXTURE_DENYLIST = [
  { kind: 'package', match: 'playwright', reason: 'pesado', fix: 'usa import type' },
  { kind: 'file', match: 'src/lib/heavy/{index,render}.ts', reason: 'motor', fix: 'usa import type' }
]

test('integración: un import de VALOR desde el barrel pesado falla; uno de TIPO pasa', async () => {
  const root = mkdtempSync(join(tmpdir(), 'reach-gate-'))

  try {
    buildFixture(root)

    const clean = await runReachabilityGate({
      root,
      denylist: FIXTURE_DENYLIST,
      allowlist: { fsDynamicPath: [] },
      batchSize: 5
    })

    assert.equal(clean.analysisErrors.length, 0, JSON.stringify(clean.analysisErrors))
    assert.equal(clean.ok, true, JSON.stringify(clean.violations))
    assert.equal(clean.entrypointCount, 1)

    writeFile(
      root,
      'src/app/api/bad/route.ts',
      `import { heavy } from '@/lib/heavy'\n\nexport const GET = () => new Response(String(typeof heavy))\n`
    )

    const dirty = await runReachabilityGate({
      root,
      denylist: FIXTURE_DENYLIST,
      allowlist: { fsDynamicPath: [] },
      batchSize: 5
    })

    assert.equal(dirty.ok, false)

    const playwright = dirty.violations.find(violation => violation.target === 'playwright')

    assert.ok(playwright, 'playwright debe aparecer como objetivo alcanzado')
    assert.deepEqual(
      playwright.entrypoints.map(item => item.entry),
      ['src/app/api/bad/route.ts'],
      'la ruta con import de tipo no debe aparecer'
    )
    assert.deepEqual(playwright.entrypoints[0].chain, [
      'src/app/api/bad/route.ts',
      'src/lib/heavy/index.ts',
      'src/lib/heavy/render.ts',
      'playwright'
    ])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('integración: un módulo alcanzable con ruta de runtime variable falla salvo que esté en la allowlist', async () => {
  const root = mkdtempSync(join(tmpdir(), 'reach-gate-fs-'))

  try {
    buildFixture(root)
    writeFile(
      root,
      'src/lib/assets.ts',
      `import { resolve } from 'node:path'\nexport const asset = (file: string) => resolve(process.cwd(), 'public', file)\n`
    )
    writeFile(
      root,
      'src/app/api/pdf/route.ts',
      `import { asset } from '@/lib/assets'\n\nexport const GET = () => new Response(asset('logo.png'))\n`
    )

    const fresh = await runReachabilityGate({
      root,
      denylist: FIXTURE_DENYLIST,
      allowlist: { fsDynamicPath: [] },
      batchSize: 5
    })

    assert.equal(fresh.ok, false)
    assert.deepEqual(
      fresh.fs.fresh.map(item => item.file),
      ['src/lib/assets.ts']
    )

    const accepted = await runReachabilityGate({
      root,
      denylist: FIXTURE_DENYLIST,
      allowlist: {
        fsDynamicPath: [
          { file: 'src/lib/assets.ts', reason: 'medido en el fixture de prueba', since: '2026-09-22' },
          { file: 'src/lib/viejo.ts', reason: 'ya no existe en el fixture', since: '2026-09-22' }
        ]
      },
      batchSize: 5
    })

    assert.equal(accepted.ok, true, 'aceptado + obsoleto no bloquean')
    assert.deepEqual(
      accepted.fs.allowlisted.map(item => item.file),
      ['src/lib/assets.ts']
    )
    assert.deepEqual(
      accepted.fs.stale.map(item => [item.file, item.why]),
      [['src/lib/viejo.ts', 'el archivo ya no existe']]
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
