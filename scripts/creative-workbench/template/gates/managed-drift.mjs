// Gate managed-drift: todo archivo sellado por el sync debe estar idéntico a su huella.
// Si falla, alguien editó (o borró) un archivo gestionado desde greenhouse-eo. La corrección no es
// actualizar el sello a mano: es revertir el cambio y proponerlo por issue.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { readLock, report, ROOT, sha256 } from './lib.mjs'

export function managedDrift() {
  const lock = readLock()

  if (!lock)
    return report('managed-drift', [
      'falta .workbench/sync.lock.json: el repo nunca fue sincronizado desde greenhouse-eo'
    ])

  const problems = []

  for (const [rel, hash] of Object.entries(lock.files)) {
    const abs = path.join(ROOT, rel)

    if (!existsSync(abs)) problems.push(`${rel}: borrado (es gestionado)`)
    else if (sha256(readFileSync(abs)) !== hash)
      problems.push(`${rel}: editado (es gestionado; revierte y propón el cambio por issue)`)
  }

  return report('managed-drift', problems)
}
