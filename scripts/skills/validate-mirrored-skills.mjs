#!/usr/bin/env node
/**
 * Fails when a versioned Codex/Claude skill mirror drifts.
 *
 * Keep the manifest intentionally small: an entry means the two complete bundles
 * are a shared contract, not merely similarly named skills.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const repo = resolve(new URL('../..', import.meta.url).pathname)
/*
 * `greenhouse-globe` entra el 2026-08-03: los dos bundles ya se venían manteniendo a mano y byte a
 * byte, sin nada que lo verificara. Un espejo que nadie valida diverge en silencio — es la misma
 * clase de drift invisible de ISSUE-126, donde una dependencia cambió de contenido sin que ninguna
 * versión lo delatara y la reconciliación falló dos días con su scheduler en verde.
 */

const mirroredSkills = [
  {
    // Data Studio se opera por UI y cambia con frecuencia. Codex y Claude deben compartir el mismo
    // catálogo, límites de autorización y protocolo browser para no editar un reporte con dos reglas.
    id: 'google-data-studio',
    mode: 'byte-identical',
    codex: '.codex/skills/google-data-studio',
    claude: '.claude/skills/google-data-studio',
  },
  {
    id: 'efeonce-mcp-platform',
    mode: 'byte-identical',
    codex: '.codex/skills/efeonce-mcp-platform',
    claude: '.claude/skills/efeonce-mcp-platform',
  },
  {
    id: 'greenhouse-globe',
    mode: 'byte-identical',
    codex: '.codex/skills/greenhouse-globe',
    claude: '.claude/skills/greenhouse-globe',
  },
  {
    id: 'greenhouse-globe-model-fleet',
    mode: 'byte-identical',
    codex: '.codex/skills/greenhouse-globe-model-fleet',
    claude: '.claude/skills/greenhouse-globe-model-fleet',
  },
  {
    // Resend es infraestructura de correo compartida: un invariante que divirja entre agentes
    // termina en que uno de los dos vuelve a activar el tracking sobre enlaces con credencial.
    id: 'resend-email-platform',
    mode: 'byte-identical',
    codex: '.codex/skills/resend-email-platform',
    claude: '.claude/skills/resend-email-platform',
  },
  {
    // El espejo existía y NADIE lo validaba: al 2026-08-20 llevaba dos actualizaciones de atraso.
    // La versión de Codex seguía declarando que la cuota de recuperación de acceso era
    // "cross-channel" cuando el código la aplica POR CANAL — así que un agente que entrara por
    // Codex le habría dicho al operador que reenviar un correo apagaba también el enlace temporal,
    // escondiéndole la única salida que le quedaba a un candidato sin acceso a su prueba.
    // La divergencia de una skill de dominio no es cosmética: es dos agentes operando el mismo
    // proceso de contratación con reglas distintas sobre una persona real.
    id: 'greenhouse-talent-people-operator',
    mode: 'byte-identical',
    codex: '.codex/skills/greenhouse-talent-people-operator',
    claude: '.claude/skills/greenhouse-talent-people-operator',
  },
]

const filesIn = root => {
  if (!existsSync(root)) return null

  const visit = directory =>
    readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) return visit(path)

      return entry.isFile() ? [relative(root, path)] : []
    })

  return visit(root).sort()
}

const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const failures = []

for (const manifest of mirroredSkills) {
  const { id, mode, codex, claude } = manifest

  if (mode !== 'byte-identical') {
    failures.push(`${id}: unsupported mirror mode '${mode}'`)
    continue
  }

  const codexRoot = join(repo, codex)
  const claudeRoot = join(repo, claude)
  const codexFiles = filesIn(codexRoot)
  const claudeFiles = filesIn(claudeRoot)

  if (!codexFiles || !claudeFiles) {
    failures.push(`${id}: mirror directory missing`)
    continue
  }

  const paths = [...new Set([...codexFiles, ...claudeFiles])].sort()

  for (const path of paths) {
    if (!codexFiles.includes(path) || !claudeFiles.includes(path)) {
      failures.push(`${id}: ${path} exists in only one mirror`)
      continue
    }

    if (digest(join(codexRoot, path)) !== digest(join(claudeRoot, path))) {
      failures.push(`${id}: ${path} content differs`)
    }
  }
}

if (failures.length) {
  console.error(`✗ Mirrored skill drift (${failures.length})`)
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`✓ Mirrored skills are identical: ${mirroredSkills.map(({ id }) => id).join(', ')}`)
