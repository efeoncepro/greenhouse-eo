import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, truncateSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import {
  MB,
  discoverFunctionTraces,
  functionNameFromTrace,
  packageFromPath,
  parseArgs,
  resolveDistDir,
  runFunctionSizeGate
} from './vercel-function-size-gate.mjs'

const writeFile = (root, rel, content = '') => {
  const abs = join(root, rel)

  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)

  return abs
}

/** Archivo disperso: reporta `size` bytes sin ocupar disco. */
const writeSized = (root, rel, size) => {
  const abs = writeFile(root, rel)

  truncateSync(abs, size)

  return abs
}

const writeTrace = (root, rel, files) => writeFile(root, rel, JSON.stringify({ version: 1, files }))

test('functionNameFromTrace nombra la función como el log de Vercel', () => {
  assert.equal(
    functionNameFromTrace('server/app/api/platform/app/insights/catalog/route.js.nft.json'),
    'api/platform/app/insights/catalog'
  )
  assert.equal(functionNameFromTrace('server/app/(dashboard)/admin/page.js.nft.json'), 'admin')
  assert.equal(functionNameFromTrace('server/app/page.js.nft.json'), 'index')
  assert.equal(functionNameFromTrace('server/middleware.js.nft.json'), 'middleware (proxy)')
})

test('packageFromPath toma el último node_modules (pnpm) y respeta scopes', () => {
  assert.equal(packageFromPath('/r/node_modules/.pnpm/pg@8.1.0/node_modules/pg/lib/index.js'), 'pg')
  assert.equal(packageFromPath('/r/node_modules/.pnpm/x/node_modules/@react-pdf/pdfkit/js/a.js'), '@react-pdf/pdfkit')
  assert.equal(packageFromPath('/r/public/branding/logo.png'), null)
})

test('parseArgs acepta flags separados o con =, y rechaza umbrales inválidos', () => {
  assert.deepEqual(parseArgs(['--dist', '.next', '--max-mb=180', '--warn-mb', '120', '--json']), {
    dist: '.next',
    maxMb: 180,
    warnMb: 120,
    json: true
  })
  assert.throws(() => parseArgs(['--max-mb', 'mucho']), /--max-mb/)
})

test('resolveDistDir: --dist manda; si no, usa el helper y cae al build local más reciente con server/', async () => {
  const root = mkdtempSync(join(tmpdir(), 'size-gate-dist-'))

  try {
    assert.equal(await resolveDistDir({ root, dist: 'custom' }), join(root, 'custom'))

    mkdirSync(join(root, '.next-local/build-20260101000000-1/server'), { recursive: true })
    mkdirSync(join(root, '.next-local/build-20260201000000-2/server'), { recursive: true })
    mkdirSync(join(root, '.next-local/build-20260301000000-3'), { recursive: true }) // sin server/: se ignora

    const resolved = await resolveDistDir({ root, latest: async () => '.next' })

    assert.equal(resolved, join(root, '.next-local/build-20260201000000-2'))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('runFunctionSizeGate mide, deduplica por ruta real y falla sobre el umbral', () => {
  const root = mkdtempSync(join(tmpdir(), 'size-gate-'))

  try {
    const dist = join(root, '.next')

    writeSized(root, 'node_modules/heavy/index.js', 3 * MB)
    symlinkSync(join(root, 'node_modules/heavy'), join(root, 'node_modules/heavy-alias'))
    writeSized(root, 'node_modules/next/dist/server.js', 1024)
    writeSized(root, 'public/logo.png', 200 * 1024)

    // Traza del runtime de Next compartida por cada función (relativa al dist dir).
    writeTrace(dist, 'next-minimal-server.js.nft.json', ['../node_modules/next/dist/server.js'])
    writeFile(dist, 'server/instrumentation.js', 'x')
    writeTrace(dist, 'server/instrumentation.js.nft.json', [])

    writeFile(dist, 'server/app/api/big/route.js', 'x')
    writeTrace(dist, 'server/app/api/big/route.js.nft.json', [
      '../../../../../node_modules/heavy/index.js',
      '../../../../../node_modules/heavy-alias/index.js', // mismo archivo real: cuenta una vez
      '../../../../../public/logo.png',
      '../../../../../no-existe.js'
    ])

    writeFile(dist, 'server/app/(dashboard)/home/page.js', 'x')
    writeTrace(dist, 'server/app/(dashboard)/home/page.js.nft.json', ['../../../../../public/logo.png'])

    writeFile(dist, 'server/middleware.js', 'x')
    writeTrace(dist, 'server/middleware.js.nft.json', [])

    assert.deepEqual(
      discoverFunctionTraces(dist).map(trace => trace.name),
      ['home', 'api/big', 'middleware (proxy)']
    )

    const report = runFunctionSizeGate({ root, distDir: dist, maxBytes: 2 * MB, warnBytes: 0.1 * MB })
    const big = report.top.find(fn => fn.name === 'api/big')
    const home = report.top.find(fn => fn.name === 'home')
    const middleware = report.top.find(fn => fn.name === 'middleware (proxy)')

    assert.equal(report.ok, false)
    assert.deepEqual(report.sharedTraces, ['next-minimal-server.js.nft.json', 'server/instrumentation.js.nft.json'])
    assert.equal(big.status, 'fail')
    assert.equal(big.missing, 1)
    // entrada (1) + heavy (3 MB, una vez) + logo (200 KB) + runtime (1 KB) + instrumentation (1)
    assert.equal(big.bytes, 1 + 3 * MB + 200 * 1024 + 1024 + 1)
    assert.equal(big.topPackages[0].name, 'heavy')
    assert.match(big.topFiles[0].path, /node_modules\/heavy\/index\.js$/)
    assert.equal(home.status, 'warn')
    assert.equal(middleware.bytes, 1, 'el middleware es una función propia: no suma las trazas compartidas')
    assert.deepEqual(
      report.failing.map(fn => fn.name),
      ['api/big']
    )

    const relaxed = runFunctionSizeGate({ root, distDir: dist, maxBytes: 10 * MB, warnBytes: 5 * MB })

    assert.equal(relaxed.ok, true)
    assert.equal(relaxed.failing.length, 0)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('sin trazas el gate no pasa en verde (un build ausente no es un build sano)', () => {
  const root = mkdtempSync(join(tmpdir(), 'size-gate-empty-'))

  try {
    mkdirSync(join(root, '.next/server'), { recursive: true })

    const report = runFunctionSizeGate({ root, distDir: join(root, '.next') })

    assert.equal(report.noTraces, true)
    assert.equal(report.ok, false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
