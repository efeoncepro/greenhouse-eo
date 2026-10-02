// Guardarraíl PreToolUse del workbench (gestionado desde greenhouse-eo).
//
// Bloquea (exit 2) dos cosas, con un mensaje que el agente debe transmitir a la persona:
//   1. editar un archivo gestionado: la lista viene del sello `.workbench/sync.lock.json`, así que
//      cubre exactamente lo que el sync entrega, sin mantener una lista aparte;
//   2. comandos que exponen llaves, borran assets o saltan la revisión.
//
// No es la barrera de seguridad (esa son las llaves que el equipo no tiene y el IAM): es la señal
// temprana que evita que un agente bienintencionado rompa algo antes de que el CI lo vea.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()
const tool = input.tool_name
const params = input.tool_input ?? {}

const block = message => {
  process.stderr.write(`Bloqueado por el guardarraíl del workbench: ${message}\n`)
  process.exit(2)
}

if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const target = params.file_path ?? params.notebook_path

  if (target) {
    const rel = path.relative(root, path.resolve(root, target)).split(path.sep).join('/')
    const lockFile = path.join(root, '.workbench/sync.lock.json')
    const managed = existsSync(lockFile) ? (JSON.parse(readFileSync(lockFile, 'utf8')).files ?? {}) : {}

    if (rel.startsWith('.workbench/') || rel in managed) {
      block(
        `${rel} es un archivo gestionado desde efeoncepro/greenhouse-eo. No se edita aquí: propón el cambio en un issue de este repo.`
      )
    }

    if (/(^|\/)\.env(\.|$)/.test(rel) && !rel.endsWith('.env.example')) {
      block('los archivos .env no los edita un agente. `pnpm doctor` crea .env.local desde .env.example.')
    }
  }
}

// Rama actual del checkout, para `git push` sin destino explícito estando en main. Sin git: null.
const currentBranch = () => {
  const r = spawnSync('git', ['-C', root, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', timeout: 5_000 })

  return r.status === 0 ? r.stdout.trim() : null
}

if (tool === 'Bash') {
  const cmd = String(params.command ?? '')
  const push = /\bgit\b.*\bpush\b/

  const rules = [
    [/gcloud\s+secrets\b/, 'los secretos no se leen ni se administran desde el workbench.'],
    [/(gcloud\s+storage\s+rm|gsutil\s+(-m\s+)?rm)\b/, 'los assets no se borran desde el workbench.'],
    [
      /\bgit\b.*\bpush\b.*(--force|\s-f\b|--force-with-lease|--mirror|--all\b)/,
      'no se fuerza un push. Todo entra por PR.'
    ],
    // `main` como destino, también en refspecs (`rama:main`, `+main`, `HEAD:refs/heads/main`) y dentro de
    // `sh -c '…'`, `$(…)` o con la ruta del binario (`/usr/bin/git`): el cierre puede ser comilla o paréntesis.
    [
      /\bgit\b.*\bpush\b.*(?:[\s:'"(]\+?|refs\/heads\/)main(?=$|[\s'"`);&|])/,
      'no se empuja a main. Crea una rama y abre un PR.'
    ],
    // El destino puede llegar por la entrada estándar o quedar configurado para un `git push` posterior.
    [/\bxargs\b.*\bgit\b.*\bpush\b/, 'no se empuja con xargs: escribe el destino explícito, en una rama.'],
    [/\bgit\b.*\bconfig\b.*\bremote\.[^\s]*\.push\b/, 'no se configura el destino del push. Todo entra por PR.'],
    [/\.env\.local/, 'no se lee ni se muestra .env.local.'],
    [
      /\b(api\.openai\.com|fal\.run|queue\.fal\.run|higgsfield\.ai|generativelanguage\.googleapis\.com)\b/,
      'la IA se usa sólo a través de los CLIs del repo (pnpm ai:*, pnpm foto:*).'
    ],
    [/\bgit\s+(commit|add)\b.*--no-verify/, 'no se saltan los hooks.']
  ]

  for (const [pattern, reason] of rules) if (pattern.test(cmd)) block(reason)

  // `git push` o `git push -u origin HEAD` sin nombrar main: el destino es la rama actual.
  if (push.test(cmd) && currentBranch() === 'main')
    block('estás en main: cualquier push iría a main. Crea una rama y abre un PR.')
}

process.exit(0)
