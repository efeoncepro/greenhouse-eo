// pnpm creative:status [--ref <ref>]
//
// Tablero del workbench visto desde greenhouse-eo:
//   · sello íntegro: el sello publicado en main es el que este repo habría escrito para su commit;
//   · sync pendiente: archivos que el plan de hoy cambiaría respecto del último sello publicado;
//   · drift: archivos gestionados que alguien editó en main del workbench (no deberían existir). Se
//     mide en un clon temporal: el checkout local de la persona no se toca, ni siquiera con fetch;
//   · rutas nativas y dependencias que los engines entregados necesitan del package.json nativo;
//   · PRs abiertos, marcando los que tocan archivos gestionados o el sello;
//   · último CI de main, miembros del equipo en GitHub y skills que citan docs que no viajan.
//
// Sólo usa la API REST de GitHub (`gh api repos/...`): GraphQL no está disponible en todos los
// entornos donde corre esto, y un tablero que se cae en la primera llamada no controla nada.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  buildPlan,
  cloneTarget,
  isNative,
  LOCK_REL,
  loadControl,
  loadManifest,
  run,
  sha256,
  verifySeal
} from './lib.mjs'

const args = process.argv.slice(2)
const value = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)

const manifest = loadManifest()
const control = loadControl()
const repo = manifest.target.repo
const branch = manifest.target.defaultBranch
const gh = (...a) => run('gh', a, { allowFail: true })
const firstLine = r => (r.stderr || r.stdout || '').trim().split('\n')[0]

// Paginación explícita y no `gh --paginate`: los enlaces `next` de GitHub apuntan a
// `repositories/{id}/...`, que algunos proxies de egress rechazan. Página a página siempre funciona.
function pagedLines(endpoint, jq) {
  const out = []

  for (let page = 1; page <= 50; page++) {
    const r = gh('api', `${endpoint}?per_page=100&page=${page}`, '--jq', jq)
    const lines = r.status === 0 ? r.stdout.split('\n').filter(Boolean) : []

    out.push(...lines)
    if (lines.length < 100) break
  }

  return out
}

const exists = gh('api', `repos/${repo}`, '--jq', '.full_name')

if (exists.status !== 0) {
  console.error(`✗ ${repo} no existe o no tengo acceso: ${firstLine(exists)}`)
  process.exit(1)
}

// Lee un JSON del workbench por la API de contenidos. Distingue "no existe" (404) de "no pude leer"
// (403, proxy, red): confundirlos haría pasar un error de acceso por un repo nunca sincronizado.
function readRemoteJson(file, ref) {
  const r = gh('api', `repos/${repo}/contents/${file}?ref=${encodeURIComponent(ref)}`, '--jq', '.content')

  if (r.status === 0) return { ok: true, value: JSON.parse(Buffer.from(r.stdout.trim(), 'base64').toString('utf8')) }

  return { ok: false, missing: /404|Not Found/i.test(r.stderr || r.stdout), error: firstLine(r) }
}

// Sello publicado en main (fuente: GitHub, no el checkout local, que puede estar atrasado).
const lockRes = readRemoteJson(LOCK_REL, branch)

if (!lockRes.ok && !lockRes.missing) {
  console.error(`✗ No pude leer ${LOCK_REL} de ${repo}@${branch}: ${lockRes.error}`)
  process.exit(1)
}

const remoteLock = lockRes.ok ? lockRes.value : null
const sealedNative = remoteLock?.native ?? []

console.log(`Workbench ${repo}`)
console.log(
  `  sello en main: ${remoteLock ? `greenhouse-eo@${remoteLock.source?.commit?.slice(0, 9) ?? '¿sin commit?'} · ${Object.keys(remoteLock.files ?? {}).length} archivos · ${sealedNative.length} rutas nativas` : 'sin sello (nunca sincronizado)'}`
)

const ref = value('--ref') ?? 'HEAD'
const current = await buildPlan({ ref })
const { plan, report, commit } = current

// Planes por commit, para verificar varios sellos (main y PRs de sync) sin recalcular dos veces.
const plans = new Map([[commit, current]])

async function planFor(sealedCommit) {
  if (!plans.has(sealedCommit)) plans.set(sealedCommit, await buildPlan({ ref: sealedCommit }))

  return plans.get(sealedCommit)
}

/** Anomalías de un sello: vacío = íntegro. Un sello que no se puede recalcular NO es íntegro. */
async function sealAnomalies(lock) {
  if (!lock?.source?.commit) return ['el sello no declara su commit de origen: no se puede verificar']

  try {
    return verifySeal(lock, await planFor(lock.source.commit))
  } catch (error) {
    return [
      `no pude recalcular greenhouse-eo@${String(lock.source.commit).slice(0, 9)}: ${error.message.split('\n')[0]} (¿commit inexistente? haz git fetch)`
    ]
  }
}

// 1. Integridad del sello: se recalcula el plan del commit que el sello declara y se compara.
if (remoteLock) {
  const anomalies = await sealAnomalies(remoteLock)

  console.log(`\nSello íntegro: ${anomalies.length ? `✗ ${anomalies.length} anomalías` : '✓'}`)
  for (const a of anomalies.slice(0, 15)) console.log(`   ! ${a}`)
  if (anomalies.length > 15) console.log(`   … y ${anomalies.length - 15} más`)
}

// 2. Sync pendiente contra el ref pedido.
const pending = []

for (const [rel, { content }] of plan) {
  if (rel === '.workbench/export-report.json') continue
  if (remoteLock?.files?.[rel] !== sha256(content)) pending.push(rel)
}

const retiring = Object.keys(remoteLock?.files ?? {}).filter(
  rel => rel !== 'pnpm-lock.yaml' && !plan.has(rel) && !isNative(rel, report.native)
)

const handingOff = Object.keys(remoteLock?.files ?? {}).filter(rel => isNative(rel, report.native))

const nativeChanged = JSON.stringify([...sealedNative].sort()) !== JSON.stringify([...report.native].sort())

console.log(
  `\nSync pendiente contra ${ref} (${commit.slice(0, 9)}): ${pending.length + retiring.length + handingOff.length || nativeChanged ? `${pending.length} a escribir · ${retiring.length} a retirar · ${handingOff.length} a entregar al workbench → pnpm creative:sync --pr` : 'ninguno ✓'}`
)
for (const rel of pending.slice(0, 15)) console.log(`   ~ ${rel}`)
if (pending.length > 15) console.log(`   … y ${pending.length - 15} más`)
for (const rel of retiring) console.log(`   - ${rel} (se retira)`)
for (const rel of handingOff) console.log(`   → ${rel} (pasa a nativo)`)
if (nativeChanged) console.log(`   native: [${sealedNative.join(', ')}] → [${report.native.join(', ')}]`)

// 3. Drift: archivos gestionados de main que no calzan con su huella. Se mide en un clon temporal de
//    main, no en el checkout local (que puede estar en otra rama o con trabajo en curso).
try {
  const { dir, cleanup } = cloneTarget(manifest, { depth: 1 })

  try {
    const lockFile = path.join(dir, LOCK_REL)

    if (!existsSync(lockFile)) console.log('\nDrift: main no tiene sello')
    else {
      const lock = JSON.parse(readFileSync(lockFile, 'utf8'))

      const drift = Object.entries(lock.files ?? {}).filter(
        ([rel, hash]) => !existsSync(path.join(dir, rel)) || sha256(readFileSync(path.join(dir, rel))) !== hash
      )

      console.log(`\nDrift en archivos gestionados de main: ${drift.length ? drift.length : 'ninguno ✓'}`)
      for (const [rel] of drift.slice(0, 15)) console.log(`   ! ${rel}`)
    }
  } finally {
    cleanup()
  }
} catch (error) {
  console.log(`\nDrift: no medido (${error.message.split('\n')[0]})`)
}

// 4. Contrato con el package.json nativo: los engines que greenhouse-eo sigue entregando necesitan
//    sus dependencias. Si el workbench las quitó, esos engines no corren allá (puede ser a propósito).
if (isNative('package.json', report.native)) {
  const pkgRes = readRemoteJson('package.json', branch)

  if (pkgRes.ok) {
    const pkg = pkgRes.value
    const declared = { ...pkg.dependencies, ...pkg.devDependencies }
    const missing = Object.keys(report.requiredDependencies).filter(name => !(name in declared))

    console.log(
      `\nDependencias de los engines entregados en el package.json nativo: ${missing.length ? `faltan ${missing.length}` : 'completas ✓'}`
    )
    for (const name of missing) console.log(`   - ${name}@${report.requiredDependencies[name]}`)
  }
}

// 5. PRs abiertos: los que no vienen del sync y tocan lo gestionado o el sello son la señal temprana
//    de una edición que el gate va a rechazar (o que intenta eximirse).
const openPrs = pagedLines(
  `repos/${repo}/pulls`,
  '.[] | [.number, .head.ref, .head.repo.full_name // "", .user.login, .draft, .title] | @tsv'
).map(line => {
  const [number, head, headRepo, author, draft, title] = line.split('\t')

  return { number, head, headRepo, author, draft: draft === 'true', title }
})

console.log(`\nPRs abiertos: ${openPrs.length || 'ninguno'}`)

for (const pr of openPrs) {
  const touched = pagedLines(`repos/${repo}/pulls/${pr.number}/files`, '.[].filename')
  const managed = touched.filter(rel => rel in (remoteLock?.files ?? {}))
  const sealTouched = touched.filter(rel => rel.startsWith('.workbench/'))
  let flag = ''

  const notes = []

  if (managed.length || sealTouched.length) {
    // El nombre de rama no prueba nada (cualquiera con push puede llamarla sync/x). Un PR de sync
    // re-sella: trae un sello NUEVO y ese sello es exactamente el que greenhouse-eo habría escrito
    // para el commit que declara. Tocar gestionados sin re-sellar es editarlos a mano.
    const reseals = sealTouched.includes(LOCK_REL)
    const headLock = reseals && pr.headRepo === repo ? readRemoteJson(LOCK_REL, pr.head) : null
    const anomalies = !reseals
      ? ['edita archivos gestionados sin re-sellar']
      : headLock?.ok
        ? await sealAnomalies(headLock.value)
        : ['sello de la rama ilegible']

    notes.push(...anomalies.slice(0, 3))
    flag = anomalies.length
      ? ` — ⚠ toca ${managed.length} gestionados${sealTouched.length ? ` y ${sealTouched.join(', ')}` : ''}`
      : ` — sync íntegro (greenhouse-eo@${headLock.value.source.commit.slice(0, 9)})`
  }

  console.log(`   #${pr.number}${pr.draft ? ' [draft]' : ''} ${pr.title} — ${pr.author} (${pr.head})${flag}`)
  for (const note of notes) console.log(`       ! ${note}`)
  if (flag.includes('⚠')) for (const rel of managed.slice(0, 8)) console.log(`       ~ ${rel}`)
  if (flag.includes('⚠') && managed.length > 8) console.log(`       … y ${managed.length - 8} más`)
}

const ci = gh(
  'api',
  `repos/${repo}/actions/runs?branch=${branch}&per_page=1`,
  '--jq',
  '.workflow_runs[0] | "\\(.status)/\\(.conclusion // "-") · \\(.display_title) · \\(.created_at)"'
)

console.log(`\nÚltimo CI en main: ${ci.stdout.trim() || 'sin corridas'}`)

const team = gh('api', `orgs/${control.github.org}/teams/${control.github.team}/members`, '--jq', '.[].login')
const desired = control.members.filter(m => m.activo !== false).map(m => m.github)

const teamLine =
  team.status === 0
    ? team.stdout.trim().split('\n').filter(Boolean).join(', ') || '(vacío)'
    : /404/.test(firstLine(team))
      ? 'no existe todavía'
      : `no disponible desde este entorno (${firstLine(team)})`

console.log(`\nEquipo @${control.github.org}/${control.github.team}: ${teamLine}`)
console.log(`  declarado en control.json: ${desired.join(', ') || '(nadie)'} → pnpm creative:access plan`)

const gaps = Object.entries(report.unresolvedSkillRefs)

console.log(`\nSkills que citan docs que no viajan: ${gaps.length || 'ninguna'}`)
for (const [skill, refs] of gaps) console.log(`   ${skill}: ${refs.length}`)
