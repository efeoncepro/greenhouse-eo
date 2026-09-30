// Gate native-policy: el harness NATIVO del workbench lo escribe este repo, pero tiene que cumplir
// las reglas de `gates/native-policy.json`, que llegan selladas desde greenhouse-eo.
//
// Es un lint de comportamiento, no una frontera de seguridad: la barrera real es IAM (el equipo no
// tiene llaves) y la revisión de PRs. Aun así se endurece contra lo barato de burlar:
//   · primero se revisan los archivos (settings y proveedores); el guardarraíl se ejecuta AL FINAL y
//     sobre una COPIA del repo, así no puede alterar lo que los otros gates leen;
//   · las sondas llevan un payload como el de Claude Code (session_id, transcript, evento) y valores
//     aleatorios, y la ruta gestionada se elige al azar del sello.
import { spawnSync } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { isNative, readJson, readLock, report, ROOT, trackedFiles } from './lib.mjs'

// Sólo se omiten tests que viven en una carpeta test/ y se llaman *.test.* (citan hosts para probar rechazos).
const isTest = rel => /(^|\/)test\/(.+\/)?[^/]+\.test\.[cm]?[jt]sx?$/.test(rel)
const stem = p => (p.endsWith('/**') ? p.slice(0, -2) : p)
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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

  if (settings.disableAllHooks) problems.push(`${policy.path}: disableAllHooks apaga el guardarraíl`)

  const deny = settings.permissions?.deny ?? []

  for (const rule of policy.requiredDeny)
    if (!deny.includes(rule)) problems.push(`${policy.path}: falta "${rule}" en permissions.deny`)

  const command = new RegExp(policy.hookCommand)

  const wired = (settings.hooks?.PreToolUse ?? []).some(entry => {
    const tools = String(entry.matcher ?? '').split('|')

    return (
      policy.hookMatcherTools.every(tool => tools.includes(tool)) &&
      (entry.hooks ?? []).some(h => h.type === 'command' && command.test(String(h.command ?? '').trim()))
    )
  })

  if (!wired)
    problems.push(
      `${policy.path}: el hook PreToolUse debe correr el guardarraíl (${policy.hookMatcherTools.join('|')}) con un comando "node …/.claude/hooks/guard.mjs"`
    )
}

function checkProviders(policy, lock, problems) {
  const managed = lock?.files ?? {}
  const allowedStems = policy.allowedIn.map(stem)

  const sdkImport = new RegExp(
    `(?:from\\s*|require\\(\\s*|import\\(\\s*)['"](${policy.sdkPackages.map(escape).join('|')})(?:/[^'"]*)?['"]`
  )

  const brokerImport = new RegExp(
    `(?:from\\s*|require\\(\\s*|import\\(\\s*)['"][^'"]*(${allowedStems.map(escape).join('|')})`
  )

  for (const rel of trackedFiles()) {
    if (rel in managed || isTest(rel) || isNative(rel, policy.allowedIn) || isNative(rel, policy.skipIn)) continue
    if (!policy.extensions.some(ext => rel.endsWith(ext))) continue

    const abs = path.join(ROOT, rel)

    if (!existsSync(abs)) continue

    const text = readFileSync(abs, 'utf8')
    const host = policy.hosts.find(h => text.includes(h))
    const where = policy.allowedIn.join(', ')

    if (host) problems.push(`${rel}: contiene ${host}. La IA pasa por el broker (${where})`)

    const sdk = text.match(sdkImport)

    if (sdk) problems.push(`${rel}: importa el SDK ${sdk[1]}. Los SDK de IA sólo viven en ${where}`)

    const reach = text.match(brokerImport)

    if (reach) problems.push(`${rel}: importa código de ${reach[1]}; el broker se usa por HTTP, no importándolo`)

    if (path.basename(rel) === 'package.json') {
      let pkg = {}

      try {
        pkg = JSON.parse(text)
      } catch {
        continue
      }

      const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies }

      for (const name of policy.sdkPackages)
        if (name in deps) problems.push(`${rel}: declara ${name}. Los SDK de IA sólo viven en ${where}`)
    }
  }
}

/** Copia de lo versionado (más el sello) a un directorio temporal: el guard corre ahí, no en el repo. */
function sandboxCopy() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'wb-native-policy-'))

  for (const rel of new Set([...trackedFiles(), '.workbench/sync.lock.json'])) {
    const src = path.join(ROOT, rel)

    if (!existsSync(src)) continue
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true })
    cpSync(src, path.join(dir, rel))
  }

  return dir
}

function checkGuard(policy, lock, problems) {
  if (!existsSync(path.join(ROOT, policy.path))) {
    problems.push(`${policy.path}: no existe; el guardarraíl de Claude es obligatorio`)

    return
  }

  const dir = sandboxCopy()
  const transcript = path.join(dir, '.sonda-transcript.jsonl')
  const sessionId = randomUUID()
  const managed = Object.keys(lock?.files ?? {})
  const rand = () => randomBytes(4).toString('hex')
  const fill = text => text.replaceAll('{rand}', rand())

  const pick = rel =>
    rel === '@managed' && managed.length ? managed[Math.floor(Math.random() * managed.length)] : fill(rel)

  writeFileSync(transcript, '')

  const probe = (toolName, toolInput) =>
    spawnSync(process.execPath, [path.join(dir, policy.path)], {
      input: JSON.stringify({
        session_id: sessionId,
        transcript_path: transcript,
        cwd: dir,
        permission_mode: 'default',
        hook_event_name: 'PreToolUse',
        tool_name: toolName,
        tool_input: toolInput
      }),
      cwd: dir,
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
      encoding: 'utf8',
      timeout: 15_000
    }).status

  try {
    for (const template of policy.mustBlockBash) {
      const command = fill(template)

      if (probe('Bash', { command }) !== 2) problems.push(`guard: debe bloquear \`${template}\``)
    }

    for (const template of policy.mustAllowBash)
      if (probe('Bash', { command: fill(template) }) !== 0) problems.push(`guard: no debe bloquear \`${template}\``)

    for (const rel of policy.mustBlockEdit.map(pick))
      if (probe('Edit', { file_path: path.join(dir, rel), old_string: 'a', new_string: 'b' }) !== 2)
        problems.push(`guard: debe impedir editar ${rel}`)

    for (const rel of policy.mustAllowEdit.map(pick))
      if (probe('Write', { file_path: path.join(dir, rel), content: 'x' }) !== 0)
        problems.push(`guard: no debe impedir escribir ${rel}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
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

  // Primero lo que se lee del disco; el guard (código del workbench) se ejecuta al final y en una copia.
  checkSettings(policy.settings, problems)
  checkProviders(policy.providers, lock, problems)
  checkGuard(policy.guard, lock, problems)

  return report('native-policy', problems)
}
