// pnpm creative:status [--ref <ref>] [--target <dir>]
//
// Tablero del workbench visto desde greenhouse-eo:
//   · sync pendiente: archivos que el plan de hoy cambiaría respecto del último sello publicado;
//   · drift: archivos gestionados que alguien editó en main del workbench (no deberían existir);
//   · PRs abiertos, último CI de main y miembros del equipo en GitHub;
//   · skills que citan docs que no viajan.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { buildPlan, LOCK_REL, loadControl, loadManifest, resolveTarget, run, sha256 } from './lib.mjs'

const args = process.argv.slice(2)
const value = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)

const manifest = loadManifest()
const control = loadControl()
const repo = manifest.target.repo
const target = resolveTarget(manifest, value('--target'))
const gh = (...a) => run('gh', a, { allowFail: true })

const exists = gh('repo', 'view', repo, '--json', 'name')

if (exists.status !== 0) {
  console.error(`✗ ${repo} no existe o no tengo acceso.`)
  process.exit(1)
}

// Sello publicado en main (fuente: GitHub, no el checkout local, que puede estar atrasado).
const lockRes = gh('api', `repos/${repo}/contents/${LOCK_REL}?ref=${manifest.target.defaultBranch}`, '--jq', '.content')

const remoteLock =
  lockRes.status === 0 ? JSON.parse(Buffer.from(lockRes.stdout.trim(), 'base64').toString('utf8')) : null

console.log(`Workbench ${repo}`)
console.log(
  `  sello en main: ${remoteLock ? `greenhouse-eo@${remoteLock.source.commit?.slice(0, 9)} · ${Object.keys(remoteLock.files).length} archivos` : 'sin sello (nunca sincronizado)'}`
)

const ref = value('--ref') ?? 'HEAD'
const { plan, report, commit } = await buildPlan({ ref })
const pending = []

for (const [rel, { content }] of plan) {
  if (rel === '.workbench/export-report.json') continue
  if (remoteLock?.files[rel] !== sha256(content)) pending.push(rel)
}

const retiring = Object.keys(remoteLock?.files ?? {}).filter(rel => rel !== 'pnpm-lock.yaml' && !plan.has(rel))

console.log(
  `\nSync pendiente contra ${ref} (${commit.slice(0, 9)}): ${pending.length + retiring.length ? `${pending.length} a escribir · ${retiring.length} a retirar → pnpm creative:sync --pr` : 'ninguno ✓'}`
)
for (const rel of pending.slice(0, 15)) console.log(`   ~ ${rel}`)
if (pending.length > 15) console.log(`   … y ${pending.length - 15} más`)

// Drift: sólo se puede medir contra un checkout al día con main.
if (existsSync(path.join(target, '.git'))) {
  run('git', ['fetch', '-q', 'origin', manifest.target.defaultBranch], { cwd: target, allowFail: true })

  const behind = run('git', ['rev-list', '--count', `HEAD..origin/${manifest.target.defaultBranch}`], {
    cwd: target,
    allowFail: true
  }).stdout.trim()

  const lockFile = path.join(target, LOCK_REL)

  if (behind === '0' && existsSync(lockFile)) {
    const lock = JSON.parse(readFileSync(lockFile, 'utf8'))

    const drift = Object.entries(lock.files).filter(
      ([rel, hash]) => !existsSync(path.join(target, rel)) || sha256(readFileSync(path.join(target, rel))) !== hash
    )

    console.log(`\nDrift en archivos gestionados: ${drift.length ? drift.length : 'ninguno ✓'}`)
    for (const [rel] of drift.slice(0, 15)) console.log(`   ! ${rel}`)
  } else {
    console.log(
      `\nDrift: no medido (checkout local ${behind ? `${behind} commits atrás de main` : 'sin sello'}; haz git pull en ${target})`
    )
  }
}

const prs = gh(
  'pr',
  'list',
  '--repo',
  repo,
  '--state',
  'open',
  '--json',
  'number,title,author,headRefName',
  '--jq',
  '.[] | "#\\(.number) \\(.title) — \\(.author.login) (\\(.headRefName))"'
)

console.log(`\nPRs abiertos:${prs.stdout.trim() ? `\n   ${prs.stdout.trim().split('\n').join('\n   ')}` : ' ninguno'}`)

const ci = gh(
  'run',
  'list',
  '--repo',
  repo,
  '--branch',
  manifest.target.defaultBranch,
  '--limit',
  '1',
  '--json',
  'conclusion,status,displayTitle,createdAt',
  '--jq',
  '.[0] | "\\(.status)/\\(.conclusion // "-") · \\(.displayTitle) · \\(.createdAt)"'
)

console.log(`\nÚltimo CI en main: ${ci.stdout.trim() || 'sin corridas'}`)

const team = gh('api', `orgs/${control.github.org}/teams/${control.github.team}/members`, '--jq', '.[].login')
const desired = control.members.filter(m => m.activo !== false).map(m => m.github)

console.log(
  `\nEquipo @${control.github.org}/${control.github.team}: ${team.status === 0 ? team.stdout.trim().split('\n').filter(Boolean).join(', ') || '(vacío)' : 'no existe todavía'}`
)
console.log(`  declarado en control.json: ${desired.join(', ') || '(nadie)'} → pnpm creative:access plan`)

const gaps = Object.entries(report.unresolvedSkillRefs)

console.log(`\nSkills que citan docs que no viajan: ${gaps.length || 'ninguna'}`)
for (const [skill, refs] of gaps) console.log(`   ${skill}: ${refs.length}`)
