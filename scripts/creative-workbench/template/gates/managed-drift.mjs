// Gate managed-drift: todo archivo sellado por el sync debe estar idéntico a su huella.
// Si falla, alguien editó (o borró) un archivo gestionado desde greenhouse-eo. La corrección no es
// actualizar el sello a mano: es revertir el cambio y proponerlo por issue.
//
// Las rutas NATIVAS (el harness propio del workbench) no se comparan: son de este repo. Qué es
// nativo lo decide greenhouse-eo y viaja en el sello (`native`); no hay otra fuente. Pedir que una
// ruta pase a ser nativa es un issue aquí y un cambio en el manifest de greenhouse-eo.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { isNative, readLock, report, ROOT, sha256 } from './lib.mjs'

export function managedDrift() {
  const lock = readLock()

  if (!lock)
    return report('managed-drift', [
      'falta .workbench/sync.lock.json: el repo nunca fue sincronizado desde greenhouse-eo'
    ])

  const native = lock.native ?? []
  const problems = []

  for (const [rel, hash] of Object.entries(lock.files)) {
    const abs = path.join(ROOT, rel)

    // Un sello escrito por el sync nunca gestiona una ruta nativa: si pasa, el sello se tocó a mano.
    if (isNative(rel, native))
      problems.push(`${rel}: el sello lo gestiona y a la vez lo declara nativo; re-sincroniza desde greenhouse-eo`)
    else if (!existsSync(abs)) problems.push(`${rel}: borrado (es gestionado)`)
    else if (sha256(readFileSync(abs)) !== hash)
      problems.push(`${rel}: editado (es gestionado; revierte y propón el cambio por issue)`)
  }

  // Una declaración de propiedad fuera del sello no tiene efecto; se avisa para que nadie la crea vigente.
  if (existsSync(path.join(ROOT, '.workbench/native-ownership.json')))
    console.log(
      '  ℹ .workbench/native-ownership.json no exime nada: las rutas nativas son las del sello (native).'
    )

  if (native.length) console.log(`  ${native.length} rutas nativas selladas (del workbench, no se comparan).`)

  return report('managed-drift', problems)
}
