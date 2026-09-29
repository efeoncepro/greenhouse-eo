// Gate hygiene: lo que entra a git es texto de trabajo, no binarios ni secretos.
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { readLock, report, ROOT, trackedFiles } from './lib.mjs'

const BINARY =
  /\.(png|jpe?g|webp|gif|tiff?|heic|psd|ai|indd|mp4|mov|webm|mkv|wav|mp3|aac|m4a|zip|rar|7z|glb|blend|fbx)$/i

const MAX_TEXT_BYTES = 1_000_000

// Formas de llaves reales. Un falso positivo aquí es barato; una llave en git no.
const SECRET_PATTERNS = [
  [/sk-(proj-)?[A-Za-z0-9_-]{20,}/, 'llave OpenAI'],
  [/sk-ant-[A-Za-z0-9_-]{20,}/, 'llave Anthropic'],
  [/AIza[0-9A-Za-z_-]{35}/, 'llave Google API'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'llave privada'],
  [/"private_key_id"\s*:/, 'JSON de service account'],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{32}\b/, 'llave fal.ai'],
  [/ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,}/, 'token GitHub']
]

export function hygiene() {
  const managed = readLock()?.files ?? {}
  const problems = []

  for (const rel of trackedFiles()) {
    const base = path.basename(rel)

    if (/^\.env(\..+)?$/.test(base) && base !== '.env.example') problems.push(`${rel}: un .env no se versiona`)

    // Los binarios gestionados (p. ej. láminas de docs de marca) llegan sellados desde greenhouse-eo.
    if (rel in managed) continue

    if (BINARY.test(rel)) {
      problems.push(`${rel}: binario en git. Súbelo al bucket con pnpm pieza:subir y registra la ruta en pieza.json`)
      continue
    }

    const size = statSync(path.join(ROOT, rel)).size

    if (size > MAX_TEXT_BYTES) {
      problems.push(`${rel}: ${Math.round(size / 1024)} KB; un archivo de trabajo tan grande va al bucket, no a git`)
      continue
    }

    const text = readFileSync(path.join(ROOT, rel), 'utf8')

    for (const [pattern, label] of SECRET_PATTERNS)
      if (pattern.test(text))
        problems.push(`${rel}: parece contener una ${label}. Quítala y avisa a Julio para rotarla`)
  }

  return report('hygiene', problems)
}
