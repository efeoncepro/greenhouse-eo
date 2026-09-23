#!/usr/bin/env node
/**
 * Vercel function size gate (ISSUE-177).
 *
 * Vercel rechaza el deploy si una función pesa más de 250 MB sin comprimir, y lo dice recién al
 * empaquetar, en el build remoto. Pasó tres veces en tres semanas (397 MB el 2026-09-02, 434 MB el
 * 2026-09-16, 441 MB el 2026-09-22) con `pnpm build` local en verde: el build de Next no reporta el
 * tamaño trazado de cada función.
 *
 * Este gate mide ese tamaño DESPUÉS de `pnpm build`, leyendo los `*.nft.json` que el build emite por
 * cada ruta/página: suma los bytes sin comprimir de los archivos trazados (deduplicados por ruta
 * real, porque pnpm enlaza el mismo archivo por varios caminos) y falla con margen bajo el límite.
 *
 * Complementa a `vercel-function-reachability-gate.mjs` (grafo de imports, sin build): aquél ve la
 * CAUSA antes de compilar; éste mide el EFECTO, incluidas causas que un grafo de imports no ve (un
 * paquete pesado que llega a través de otro paquete, un directorio trazado por un `readdir`).
 *
 * ⚠️ Cota inferior: Vercel agrupa varias rutas en una misma función, así que el tamaño por ruta que
 * se mide acá es un piso del tamaño real de la función que la contiene. Por eso el umbral de
 * bloqueo (200 MB) deja 50 MB de margen bajo el límite.
 *
 * Uso: node scripts/ci/vercel-function-size-gate.mjs [--dist <dir>] [--max-mb 200] [--warn-mb 150] [--json]
 *      (pnpm vercel:function-size-gate)
 */
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Vercel informa "441.09mb": usa MiB (1024²). Se usa la misma unidad para que las cifras calcen. */
export const MB = 1024 * 1024

export const DEFAULT_MAX_MB = 200
export const DEFAULT_WARN_MB = 150

/**
 * Trazas que Vercel suma a CADA función de ruta/página, en orden de preferencia.
 *
 * - `next-minimal-server.js.nft.json`: el runtime de Next en "minimal mode", que es como Vercel
 *   ejecuta las funciones del App Router. `next-server.js.nft.json` es el servidor completo de
 *   `next start` (self-hosting) e incluye cosas que la función de Vercel no carga; sólo se usa si
 *   el minimal no existe (builds viejos), para no subestimar.
 * - `server/instrumentation.js.nft.json`: el hook de instrumentación (Sentry) se carga en cada
 *   función Node. Sumarlo es conservador: si Vercel lo empaquetara aparte, el error es por exceso.
 */
export const SERVER_RUNTIME_TRACES = ['next-minimal-server.js.nft.json', 'next-server.js.nft.json']
export const PER_FUNCTION_SHARED_TRACES = ['server/instrumentation.js.nft.json']

const toPosix = value => value.split(sep).join('/')

// ───────────────────────────── Directorio del build ─────────────────────────────

const hasServerDir = dir => existsSync(join(dir, 'server'))

/**
 * Directorio del build a medir. `--dist` manda; si no, se resuelve igual que `next start`
 * (`scripts/next-dist-dir.mjs`: `.next` en CI/Vercel; el último `.next-local/build-*` en local).
 */
export const resolveDistDir = async ({ root = repoRoot, dist, latest } = {}) => {
  if (dist) return resolve(root, dist)

  const resolveLatest = latest ?? (await import('../next-dist-dir.mjs')).resolveLatestStartDistDir
  const candidate = resolve(root, await resolveLatest())

  if (hasServerDir(candidate)) return candidate

  // Respaldo: `.next` con server/ o el `.next-local/build-*` más reciente.
  if (hasServerDir(join(root, '.next'))) return join(root, '.next')

  const localRoot = join(root, '.next-local')

  if (existsSync(localRoot)) {
    const newest = readdirSync(localRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith('build-'))
      .map(entry => entry.name)
      .sort()
      .reverse()
      .find(name => hasServerDir(join(localRoot, name)))

    if (newest) return join(localRoot, newest)
  }

  return candidate
}

// ───────────────────────────── Trazas ─────────────────────────────

const readTrace = nftPath => {
  const parsed = JSON.parse(readFileSync(nftPath, 'utf8'))

  return Array.isArray(parsed.files) ? parsed.files : []
}

const walkTraceFiles = (absDir, out) => {
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const absPath = join(absDir, entry.name)

    if (entry.isDirectory()) walkTraceFiles(absPath, out)
    else if (entry.name.endsWith('.nft.json')) out.push(absPath)
  }

  return out
}

/**
 * Nombre legible de la función, como lo escribe Vercel en su log: sin `server/app/`, sin el
 * sufijo `/route` o `/page` y sin grupos de rutas `(x)`.
 */
export const functionNameFromTrace = relTracePath => {
  const withoutSuffix = relTracePath.replace(/\.nft\.json$/, '').replace(/\.js$/, '')

  if (withoutSuffix === 'server/middleware') return 'middleware (proxy)'

  const withoutRoot = withoutSuffix.replace(/^server\/(app|pages)\//, '')
  const segments = withoutRoot.split('/').filter(segment => !/^\(.+\)$/.test(segment))

  if (['route', 'page'].includes(segments.at(-1))) segments.pop()

  return segments.join('/') || 'index'
}

/**
 * Trazas que corresponden a una función: rutas y páginas (App y Pages Router) y el middleware
 * (proxy), que Vercel despliega como función propia. Las trazas compartidas no son funciones.
 */
export const discoverFunctionTraces = distDir => {
  const serverDir = join(distDir, 'server')

  if (!existsSync(serverDir)) return []

  const traces = walkTraceFiles(serverDir, [])
    .map(absPath => toPosix(relative(distDir, absPath)))
    .filter(rel => rel.startsWith('server/app/') || rel.startsWith('server/pages/') || rel === 'server/middleware.js.nft.json')
    .sort()

  return traces.map(rel => ({ nft: rel, name: functionNameFromTrace(rel), includeShared: rel !== 'server/middleware.js.nft.json' }))
}

const directorySize = absDir => {
  let total = 0

  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const absPath = join(absDir, entry.name)

    try {
      if (entry.isDirectory()) total += directorySize(absPath)
      else total += lstatSync(absPath).size
    } catch {
      // archivo que desapareció durante la lectura: no suma
    }
  }

  return total
}

/**
 * Info de un archivo trazado, con caché (las ~1.500 funciones comparten la mayoría de archivos).
 * `key` es la ruta real: pnpm expone el mismo archivo por varios caminos y Vercel lo copia una vez.
 * Un symlink a directorio (los alias con hash de `<dist>/node_modules/*`) cuenta sólo el enlace: los
 * archivos de su destino vienen listados aparte en la misma traza.
 */
export const createFileInfoResolver = () => {
  const cache = new Map()

  return absPath => {
    const cached = cache.get(absPath)

    if (cached) return cached

    let info

    try {
      const linkStat = lstatSync(absPath)

      if (linkStat.isSymbolicLink()) {
        const realPath = realpathSync(absPath)
        const targetStat = statSync(realPath)

        info = targetStat.isDirectory()
          ? { key: absPath, size: linkStat.size, kind: 'symlink-dir' }
          : { key: realPath, size: targetStat.size, kind: 'file' }
      } else if (linkStat.isDirectory()) {
        info = { key: realpathSync(absPath), size: directorySize(absPath), kind: 'directory' }
      } else {
        info = { key: realpathSync(absPath), size: linkStat.size, kind: 'file' }
      }
    } catch {
      info = { key: absPath, size: 0, kind: 'missing' }
    }

    cache.set(absPath, info)

    return info
  }
}

/** Paquete npm dueño de una ruta real (`…/node_modules/@scope/pkg/…` → `@scope/pkg`), o null. */
export const packageFromPath = filePath => {
  const posix = toPosix(filePath)
  const marker = '/node_modules/'
  const index = posix.lastIndexOf(marker)

  if (index === -1) return null

  const segments = posix.slice(index + marker.length).split('/')

  return segments[0].startsWith('@') ? `${segments[0]}/${segments[1]}` : segments[0]
}

/**
 * Mide una función: entrada + archivos de su traza + trazas compartidas, deduplicados por ruta real.
 * Devuelve bytes, conteos y (si `keepFiles`) la lista para diagnosticar los más pesados.
 */
export const measureFunction = ({ distDir, trace, sharedFiles, fileInfo, keepFiles = false }) => {
  const nftAbs = join(distDir, trace.nft)
  const traceDir = dirname(nftAbs)
  const entryAbs = nftAbs.replace(/\.nft\.json$/, '')
  const candidates = [entryAbs, ...readTrace(nftAbs).map(file => resolve(traceDir, file))]

  if (trace.includeShared) candidates.push(...sharedFiles)

  const seen = new Set()
  const files = []
  let bytes = 0
  let missing = 0

  for (const absPath of candidates) {
    const info = fileInfo(absPath)

    if (info.kind === 'missing') {
      missing += 1
      continue
    }

    if (seen.has(info.key)) continue

    seen.add(info.key)
    bytes += info.size

    if (keepFiles) files.push({ path: info.key, size: info.size })
  }

  return { bytes, fileCount: seen.size, missing, files }
}

/** Los N archivos más pesados y los N paquetes npm que más aportan. */
export const summarizeHeaviest = (files, root, limit = 10) => {
  const topFiles = [...files]
    .sort((left, right) => right.size - left.size)
    .slice(0, limit)
    .map(file => ({ path: toPosix(relative(root, file.path)), size: file.size }))

  const byPackage = new Map()

  for (const file of files) {
    const pkg = packageFromPath(file.path)

    if (pkg) byPackage.set(pkg, (byPackage.get(pkg) ?? 0) + file.size)
  }

  const topPackages = [...byPackage.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([name, size]) => ({ name, size }))

  return { topFiles, topPackages }
}

/**
 * Corre el gate y devuelve el reporte (no imprime). `root` sólo se usa para mostrar rutas
 * relativas; `distDir` es absoluto.
 */
export const runFunctionSizeGate = ({
  root = repoRoot,
  distDir,
  maxBytes = DEFAULT_MAX_MB * MB,
  warnBytes = DEFAULT_WARN_MB * MB,
  top = 10
}) => {
  const startedAt = Date.now()
  const traces = discoverFunctionTraces(distDir)
  const fileInfo = createFileInfoResolver()

  const runtimeTrace = SERVER_RUNTIME_TRACES.find(name => existsSync(join(distDir, name))) ?? null
  const sharedTraces = [runtimeTrace, ...PER_FUNCTION_SHARED_TRACES.filter(name => existsSync(join(distDir, name)))].filter(Boolean)
  const sharedFiles = []

  for (const name of sharedTraces) {
    const nftAbs = join(distDir, name)
    const traceDir = dirname(nftAbs)
    const entryAbs = nftAbs.replace(/\.nft\.json$/, '')

    // `next-minimal-server.js` no existe en el build: su traza describe archivos de `next` en
    // node_modules. Sólo se suma la entrada cuando es un archivo real (instrumentation.js).
    if (existsSync(entryAbs)) sharedFiles.push(entryAbs)

    sharedFiles.push(...readTrace(nftAbs).map(file => resolve(traceDir, file)))
  }

  const functions = []

  for (const trace of traces) {
    const measured = measureFunction({ distDir, trace, sharedFiles, fileInfo, keepFiles: true })
    const status = measured.bytes > maxBytes ? 'fail' : measured.bytes > warnBytes ? 'warn' : 'ok'

    functions.push({
      name: trace.name,
      nft: trace.nft,
      bytes: measured.bytes,
      fileCount: measured.fileCount,
      missing: measured.missing,
      status,
      // Sólo las funciones sobre el umbral de advertencia guardan el detalle: el resto se descarta.
      ...(status === 'ok' ? {} : summarizeHeaviest(measured.files, root, top))
    })
  }

  functions.sort((left, right) => right.bytes - left.bytes)

  const failing = functions.filter(fn => fn.status === 'fail')
  const warning = functions.filter(fn => fn.status === 'warn')

  return {
    ok: traces.length > 0 && failing.length === 0,
    noTraces: traces.length === 0,
    distDir: toPosix(relative(root, distDir)) || '.',
    sharedTraces,
    maxBytes,
    warnBytes,
    functionCount: functions.length,
    durationMs: Date.now() - startedAt,
    top: functions.slice(0, top),
    failing,
    warning
  }
}

// ───────────────────────────── CLI ─────────────────────────────

const formatMb = bytes => `${(bytes / MB).toFixed(1).padStart(7)} MB`

export const parseArgs = argv => {
  const options = { dist: null, maxMb: DEFAULT_MAX_MB, warnMb: DEFAULT_WARN_MB, json: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const [flag, inline] = arg.split('=')
    const value = () => inline ?? argv[(index += 1)]

    if (flag === '--json') options.json = true
    else if (flag === '--dist') options.dist = value()
    else if (flag === '--max-mb') options.maxMb = Number(value())
    else if (flag === '--warn-mb') options.warnMb = Number(value())
  }

  if (!Number.isFinite(options.maxMb) || options.maxMb <= 0) throw new Error('--max-mb debe ser un número positivo.')
  if (!Number.isFinite(options.warnMb) || options.warnMb <= 0) throw new Error('--warn-mb debe ser un número positivo.')

  return options
}

const printDetail = fn => {
  console.log(`    Archivos más pesados de ${fn.name}:`)

  for (const file of fn.topFiles) console.log(`      ${formatMb(file.size)}  ${file.path}`)

  if (fn.topPackages.length) {
    console.log(`    Paquetes npm que más aportan:`)

    for (const pkg of fn.topPackages) console.log(`      ${formatMb(pkg.size)}  ${pkg.name}`)
  }
}

const printReport = report => {
  console.log(`Build medido: ${report.distDir}`)
  console.log(`Trazas compartidas sumadas a cada función: ${report.sharedTraces.join(' + ') || '(ninguna)'}`)
  console.log(`Funciones medidas: ${report.functionCount} · ${(report.durationMs / 1000).toFixed(1)} s`)
  console.log('')
  console.log(`Top ${report.top.length} funciones por tamaño trazado (sin comprimir):`)

  for (const fn of report.top) {
    const mark = fn.status === 'fail' ? '✗' : fn.status === 'warn' ? '⚠' : ' '

    console.log(`  ${mark} ${formatMb(fn.bytes)}  ${fn.name}  (${fn.fileCount} archivos${fn.missing ? `, ${fn.missing} faltantes` : ''})`)
  }

  for (const fn of report.warning) {
    console.log('')
    console.log(`⚠ ${fn.name} pesa ${formatMb(fn.bytes).trim()} (advertencia sobre ${report.warnBytes / MB} MB).`)
    printDetail(fn)
  }

  for (const fn of report.failing) {
    console.error('')
    console.error(`✗ ${fn.name} pesa ${formatMb(fn.bytes).trim()}: supera el bloqueo de ${report.maxBytes / MB} MB (límite de Vercel: 250 MB).`)
    console.error(`  Traza: ${fn.nft}`)
    printDetail(fn)
  }

  console.log('')
  console.log(
    'Nota: Vercel agrupa varias rutas en una sola función; el tamaño por ruta es una COTA INFERIOR del de la función real.'
  )

  if (report.failing.length) {
    console.error('')
    console.error(
      'Cómo arreglar: busca en los archivos/paquetes más pesados qué no debería estar. Un paquete de render ' +
        '(playwright, pdf-lib) o un directorio completo del proyecto casi siempre viene de un import de VALOR desde ' +
        'un barrel pesado o de una ruta armada con `process.cwd()` más un segmento variable. ' +
        '`pnpm vercel:reachability-gate` muestra la cadena de imports. No subas el límite con VERCEL_SUPPORT_LARGE_FUNCTIONS.'
    )
    console.error('✗ Gate de tamaño de funciones de Vercel en rojo (ISSUE-177).')
  } else {
    console.log(`✓ Ninguna función supera ${report.maxBytes / MB} MB.`)
  }
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  const distDir = await resolveDistDir({ dist: options.dist })

  const report = runFunctionSizeGate({
    distDir,
    maxBytes: options.maxMb * MB,
    warnBytes: options.warnMb * MB
  })

  if (options.json) {
    console.log(JSON.stringify(report, null, 2))
  } else if (report.noTraces) {
    console.error(`✗ No hay trazas *.nft.json en ${report.distDir}/server. Corre \`pnpm build\` antes de este gate (o pasa --dist <dir>).`)
  } else {
    printReport(report)
  }

  return report.ok ? 0 : 1
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  main()
    .then(code => process.exit(code))
    .catch(error => {
      console.error(`✗ vercel-function-size-gate falló: ${error.stack ?? error.message}`)
      process.exit(1)
    })
}
