// Gate native-policy: el harness NATIVO del workbench lo escribe este repo, pero tiene que cumplir
// las reglas de `gates/native-policy.json`, que llegan selladas desde greenhouse-eo.
//
// Se verifica por comportamiento, no leyendo el código: el guardarraíl se ejecuta con sondas (lo que
// debe bloquear y lo que debe dejar pasar). Así el workbench puede reescribirlo como quiera sin que
// este gate se entere, mientras siga protegiendo lo mismo.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { isNative, readJson, readLock, report, ROOT, trackedFiles } from './lib.mjs'

const isTest = rel => /(^|\/)(test|tests|__tests__)\//.test(rel) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel)

function probeGuard(guardAbs, toolName, toolInput) {
  const r = spawnSync(process.execPath, [guardAbs], {
    input: JSON.stringify({ tool_name: toolName, tool_input: toolInput, cwd: ROOT }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
    encoding: 'utf8',
    timeout: 15_000
  })

  return r.status
}

function checkGuard(policy, lock, problems) {
  const guardAbs = path.join(ROOT, policy.path)

  if (!existsSync(guardAbs)) {
    problems.push(`${policy.path}: no existe; el guardarraíl de Claude es obligatorio`)

    return
  }

  // Una ruta gestionada cualquiera del sello: el guard debe impedir editarla.
  const managed = Object.keys(lock?.files ?? {}).find(rel => rel.startsWith('gates/')) ?? 'gates/lib.mjs'
  const resolve = rel => (rel === '@managed' ? managed : rel)

  for (const command of policy.mustBlockBash)
    if (probeGuard(guardAbs, 'Bash', { command }) !== 2) problems.push(`guard: debe bloquear \`${command}\``)

  for (const command of policy.mustAllowBash)
    if (probeGuard(guardAbs, 'Bash', { command }) !== 0) problems.push(`guard: no debe bloquear \`${command}\``)

  for (const rel of policy.mustBlockEdit.map(resolve))
    if (probeGuard(guardAbs, 'Edit', { file_path: path.join(ROOT, rel) }) !== 2)
      problems.push(`guard: debe impedir editar ${rel}`)

  for (const rel of policy.mustAllowEdit.map(resolve))
    if (probeGuard(guardAbs, 'Write', { file_path: path.join(ROOT, rel) }) !== 0)
      problems.push(`guard: no debe impedir escribir ${rel}`)
}

function checkSettings(policy, problems) {
  const abs = path.join(ROOT, policy.path)

  if (!existsSync(abs)) {
    problems.push(`${policy.path}: no existe`)

    return
  }

  let settings

  try {
    settings = JSON.parse(readFileSync(abs, 'utf8'))
  } catch {
    problems.push(`${policy.path}: no es JSON válido`)

    return
  }

  const deny = settings.permissions?.deny ?? []

  for (const rule of policy.requiredDeny)
    if (!deny.includes(rule)) problems.push(`${policy.path}: falta "${rule}" en permissions.deny`)

  const wired = (settings.hooks?.PreToolUse ?? []).some(
    entry =>
      policy.hookMatcherIncludes.every(tool => String(entry.matcher ?? '').includes(tool)) &&
      (entry.hooks ?? []).some(h => String(h.command ?? '').includes(policy.hookCommandIncludes))
  )

  if (!wired)
    problems.push(
      `${policy.path}: el hook PreToolUse debe correr ${policy.hookCommandIncludes} para ${policy.hookMatcherIncludes.join('/')}`
    )
}

function checkProviders(policy, lock, problems) {
  const managed = lock?.files ?? {}

  for (const rel of trackedFiles()) {
    if (rel in managed || isTest(rel) || isNative(rel, policy.allowedIn)) continue
    if (!policy.codeExtensions.some(ext => rel.endsWith(ext))) continue

    const abs = path.join(ROOT, rel)

    if (!existsSync(abs)) continue

    const text = readFileSync(abs, 'utf8')
    const hit = policy.hosts.find(host => text.includes(host))

    if (hit)
      problems.push(
        `${rel}: llama a ${hit}. La IA pasa por el broker (${policy.allowedIn.join(', ')}); sácalo de aquí o pide que se admita`
      )
  }
}

export function nativePolicy() {
  const problems = []

  let policy

  try {
    policy = readJson('gates/native-policy.json')
  } catch {
    return report('native-policy', ['falta gates/native-policy.json: re-sincroniza desde greenhouse-eo'])
  }

  const lock = readLock()

  checkGuard(policy.guard, lock, problems)
  checkSettings(policy.settings, problems)
  checkProviders(policy.providers, lock, problems)

  return report('native-policy', problems)
}
