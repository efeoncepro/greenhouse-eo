// Guardarraíl PreToolUse del workbench (gestionado desde greenhouse-eo).
//
// Bloquea (exit 2) dos cosas, con un mensaje que el agente debe transmitir a la persona:
//   1. editar un archivo gestionado: la lista viene del sello `.workbench/sync.lock.json`, así que
//      cubre exactamente lo que el sync entrega, sin mantener una lista aparte;
//   2. comandos que exponen llaves, borran assets o saltan la revisión.
//
// No es la barrera de seguridad (esa son las llaves que el equipo no tiene y el IAM): es la señal
// temprana que evita que un agente bienintencionado rompa algo antes de que el CI lo vea.
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

if (tool === 'Bash') {
  const cmd = String(params.command ?? '')

  const rules = [
    [/gcloud\s+secrets\b/, 'los secretos no se leen ni se administran desde el workbench.'],
    [/(gcloud\s+storage\s+rm|gsutil\s+(-m\s+)?rm)\b/, 'los assets no se borran desde el workbench.'],
    [/git\s+push\b.*(--force|\s-f\b|--force-with-lease)/, 'no se fuerza un push. Todo entra por PR.'],
    [/git\s+push\b.*\s(origin\s+)?(HEAD:)?main(\s|$)/, 'no se empuja a main. Crea una rama y abre un PR.'],
    [/\.env\.local/, 'no se lee ni se muestra .env.local.'],
    [
      /\b(api\.openai\.com|fal\.run|queue\.fal\.run|higgsfield\.ai|generativelanguage\.googleapis\.com)\b/,
      'la IA se usa sólo a través de los CLIs del repo (pnpm ai:*, pnpm foto:*).'
    ],
    [/\bgit\s+(commit|add)\b.*--no-verify/, 'no se saltan los hooks.']
  ]

  for (const [pattern, reason] of rules) if (pattern.test(cmd)) block(reason)
}

process.exit(0)
