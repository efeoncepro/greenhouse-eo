// pnpm creative:sync [--ref <ref>] [--target <dir>] [--pr | --bootstrap] [--no-install]
//
// Materializa el plan de exportación de un ref de greenhouse-eo (HEAD por defecto) en el checkout
// local del creative-workbench:
//   · escribe cada archivo gestionado (plantilla, skills, CLIs, docs, package.json, config);
//   · borra los que el sello anterior gestionaba y el plan nuevo ya no trae, salvo los que pasaron a
//     ser NATIVOS (manifest → native.paths): esos se sueltan del sello sin borrarlos;
//   · regenera pnpm-lock.yaml con las versiones fijadas (si no es nativo);
//   · sella todo en `.workbench/sync.lock.json` (sha256 + commit de origen + lista nativa).
//
// Nunca toca lo que no gestiona: `projects/**` del equipo y el harness nativo quedan intactos, y si
// una ruta del plan ya existe sin estar en el sello, aborta en vez de pisarla.
//
// Sin flags sólo escribe en disco y muestra el diff. `--pr` crea rama, commit, push y PR (el camino
// normal). `--bootstrap` hace el primer commit directo en main (sólo para un repo sin commits).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  buildPlan,
  isNative,
  LOCK_REL,
  loadManifest,
  readLock,
  reconcile,
  resolveTarget,
  run,
  sha256,
  uncommittedExportable
} from './lib.mjs'

const args = process.argv.slice(2)
const flag = name => args.includes(name)
const value = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)

const manifest = loadManifest()
const target = resolveTarget(manifest, value('--target'))
const ref = value('--ref') ?? 'HEAD'

if (!existsSync(path.join(target, '.git'))) {
  console.error(
    `✗ ${target} no es un checkout git del workbench. Clónalo primero:\n  gh repo clone ${manifest.target.repo} ${target}`
  )
  process.exit(1)
}

const hasCommits = run('git', ['rev-parse', '--verify', 'HEAD'], { cwd: target, allowFail: true }).status === 0

if (flag('--bootstrap') && hasCommits) {
  console.error('✗ --bootstrap es sólo para un repo sin commits. Para un workbench existente usa --pr.')
  process.exit(1)
}

const targetStatus = run('git', ['status', '--porcelain'], { cwd: target }).stdout.trim()

if (targetStatus && flag('--pr')) {
  console.error(
    `✗ El checkout del workbench tiene cambios sin commitear; no mezclo un sync con trabajo ajeno:\n${targetStatus}`
  )
  process.exit(1)
}

if (flag('--pr')) {
  run('git', ['fetch', 'origin', manifest.target.defaultBranch], { cwd: target })
  run('git', ['checkout', manifest.target.defaultBranch], { cwd: target })
  run('git', ['reset', '--hard', `origin/${manifest.target.defaultBranch}`], { cwd: target })
}

const dirty = uncommittedExportable()

if (dirty.length) {
  console.log(
    `⚠ ${dirty.length} rutas exportables tienen cambios sin commitear en greenhouse-eo. NO viajan: se exporta ${ref}.`
  )
  for (const rel of dirty.slice(0, 8)) console.log(`   ${rel}`)
  if (dirty.length > 8) console.log(`   … y ${dirty.length - 8} más`)
}

console.log(`→ Calculando plan de exportación desde ${ref}…`)
const { plan, report, commit } = await buildPlan({ ref })
const previous = readLock(target)
const { native } = report

const { added, changed, removed, handedOff, collisions } = reconcile({
  plan,
  previous,
  native,
  targetHash: rel => {
    const abs = path.join(target, rel)

    return existsSync(abs) ? sha256(readFileSync(abs)) : null
  }
})

// Antes de escribir nada: el sync no pisa archivos que no gestionaba. Si una ruta del plan ya existe
// en el workbench sin estar en el sello, es trabajo de otro (típicamente el harness nativo): hay que
// decidir de quién es — declararla nativa en el manifest o moverla allá — no sobrescribirla.
if (collisions.length) {
  console.error(
    `✗ ${collisions.length} rutas del plan ya existen en el workbench y no las gestiona el sello. No las piso:`
  )
  for (const rel of collisions) console.error(`   ! ${rel}`)
  console.error('  Decide su dueño: declárala en export-manifest.json → native.paths o quítala de la plantilla.')
  process.exit(1)
}

for (const rel of [...added, ...changed]) {
  const dest = path.join(target, rel)

  mkdirSync(path.dirname(dest), { recursive: true })
  writeFileSync(dest, plan.get(rel).content)
}

for (const rel of removed) rmSync(path.join(target, rel), { force: true })

const lockfileNative = isNative('pnpm-lock.yaml', native)

if (lockfileNative) {
  console.log('→ pnpm-lock.yaml es nativo: lo mantiene el workbench, no se regenera.')
} else if (!flag('--no-install')) {
  console.log('→ Regenerando pnpm-lock.yaml…')

  // Misma credencial efímera que `pnpm instalar` del workbench: userconfig temporal, borrado siempre.
  const token = run('gh', ['auth', 'token']).stdout.trim()
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'workbench-npmrc-'))

  try {
    writeFileSync(path.join(tmp, 'npmrc'), `//npm.pkg.github.com/:_authToken=${token}\n`, { mode: 0o600 })
    run('pnpm', ['install', '--lockfile-only', '--ignore-scripts'], {
      cwd: target,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, NPM_CONFIG_USERCONFIG: path.join(tmp, 'npmrc') }
    })
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

// Sello: cada archivo gestionado con su huella (el lockfile de pnpm también, salvo que sea nativo),
// más la lista nativa vigente. El gate managed-drift del workbench lee `native` DE ACÁ: una
// declaración nativa que no pasó por greenhouse-eo no exime nada.
const files = {}

for (const rel of [...plan.keys(), ...(lockfileNative ? [] : ['pnpm-lock.yaml'])].sort()) {
  const abs = path.join(target, rel)

  if (existsSync(abs)) files[rel] = sha256(readFileSync(abs))
}

const lock = {
  _comentario:
    'Generado por `pnpm creative:sync` en greenhouse-eo. No se edita: el gate managed-drift compara cada archivo contra esta huella; `native` lista lo que es del workbench y sólo cambia por un sync.',
  source: { repo: 'efeoncepro/greenhouse-eo', ref, commit },
  native,
  files
}

mkdirSync(path.dirname(path.join(target, LOCK_REL)), { recursive: true })
writeFileSync(path.join(target, LOCK_REL), `${JSON.stringify(lock, null, 2)}\n`)

console.log(`\n✓ Plan de greenhouse-eo@${commit.slice(0, 9)} aplicado en ${target}`)
console.log(
  `  ${Object.entries(report.counts)
    .map(([k, n]) => `${k}=${n}`)
    .join('  ')}`
)
console.log(
  `  nuevos=${added.length}  cambiados=${changed.length}  retirados=${removed.length}  entregados=${handedOff.length}`
)

for (const [label, list] of [
  ['+', added],
  ['~', changed],
  ['-', removed],
  ['→', handedOff]
]) {
  for (const rel of list.slice(0, 25)) console.log(`   ${label} ${rel}`)
  if (list.length > 25) console.log(`   ${label} … y ${list.length - 25} más`)
}

const skillsWithGaps = Object.keys(report.unresolvedSkillRefs)

if (skillsWithGaps.length)
  console.log(
    `\n  ℹ ${skillsWithGaps.length} skills citan docs que no viajan (detalle en .workbench/export-report.json).`
  )

const pending = run('git', ['status', '--porcelain'], { cwd: target }).stdout.trim()

if (!pending) {
  console.log('\n= Sin cambios: el workbench ya está al día con greenhouse-eo.')
  process.exit(0)
}

// `git add -A` respeta el .gitignore, y el .gitignore puede ser nativo: una ruta del plan que el
// workbench ignore se quedaría sin commitear y el sello la declararía igual. Se fuerza el plan y el sello.
function stageAll() {
  run('git', ['add', '-A'], { cwd: target })

  const forced = [...plan.keys(), LOCK_REL].filter(rel => existsSync(path.join(target, rel)))

  for (let i = 0; i < forced.length; i += 200)
    run('git', ['add', '-f', '--', ...forced.slice(i, i + 200)], { cwd: target })
}

const shortSha = commit.slice(0, 9)
const message = `chore(sync): workbench desde greenhouse-eo@${shortSha}`

if (flag('--bootstrap')) {
  stageAll()
  run('git', ['commit', '-q', '-m', message], { cwd: target })
  run('git', ['push', '-u', 'origin', `HEAD:${manifest.target.defaultBranch}`], { cwd: target, stdio: 'inherit' })
  console.log(`\n✓ Bootstrap empujado a ${manifest.target.repo}@${manifest.target.defaultBranch}`)
} else if (flag('--pr')) {
  const branch = `sync/${new Date().toISOString().slice(0, 10)}-${shortSha}`

  run('git', ['checkout', '-B', branch], { cwd: target })
  stageAll()
  run('git', ['commit', '-q', '-m', message], { cwd: target })
  run('git', ['push', '-u', '--force-with-lease', 'origin', branch], { cwd: target, stdio: 'inherit' })

  const body = [
    `Sincronización gestionada desde \`efeoncepro/greenhouse-eo@${commit}\` (${ref}).`,
    '',
    `- nuevos: ${added.length} · cambiados: ${changed.length} · retirados: ${removed.length} · entregados al workbench: ${handedOff.length}`,
    `- ${Object.entries(report.counts)
      .map(([k, n]) => `${k}=${n}`)
      .join(' · ')}`,
    `- rutas nativas selladas: ${native.length ? native.join(', ') : 'ninguna'}`,
    ...(handedOff.length
      ? [`- pasan a ser nativas (el sync deja de gestionarlas y NO las borra): ${handedOff.join(', ')}`]
      : []),
    '',
    'Este PR sólo toca archivos gestionados (ver `.workbench/sync.lock.json`). No se edita a mano.'
  ].join('\n')

  // REST y no `gh pr list/create`: esos usan GraphQL, que no está disponible en todos los entornos
  // donde corre esto (p. ej. sesiones remotas de agentes).
  const [owner] = manifest.target.repo.split('/')

  const existing = run(
    'gh',
    ['api', `repos/${manifest.target.repo}/pulls?state=open&head=${owner}:${branch}`, '--jq', '.[0].html_url // ""'],
    { cwd: target }
  ).stdout.trim()

  const url =
    existing ||
    run(
      'gh',
      [
        'api',
        '-X',
        'POST',
        `repos/${manifest.target.repo}/pulls`,
        '-f',
        `title=${message}`,
        '-f',
        `head=${branch}`,
        '-f',
        `base=${manifest.target.defaultBranch}`,
        '-f',
        `body=${body}`,
        '--jq',
        '.html_url'
      ],
      { cwd: target }
    ).stdout.trim()

  run('git', ['checkout', manifest.target.defaultBranch], { cwd: target })
  console.log(`\n✓ PR de sync: ${url}`)
} else {
  console.log('\n  Cambios escritos en disco, sin commit. Para publicarlos: pnpm creative:sync --pr')
}
