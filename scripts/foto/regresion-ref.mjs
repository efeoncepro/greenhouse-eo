// Extrae de git una versión COMPLETA del compositor —el archivo de entrada y todas sus dependencias locales, tal como
// estaban en la referencia— para que la regresión compare dos versiones de verdad.
//
// Auditoría adversarial 2026-09-23 (hallazgo 13): la regresión extraía sólo el compositor, y sus imports relativos
// resolvían al árbol de trabajo. La «referencia» corría con las dependencias NUEVAS: un cambio en accesibilidad.mjs,
// en las variantes o en el layout compiler nunca aparecía como diferencia. Ahora se recorre el cierre de imports
// relativos en la referencia y cada archivo se escribe JUNTO a su original, con nombre `.ref-<etiqueta>--<nombre>`
// (misma carpeta: las rutas a fuentes y assets que el código arma desde su propia ubicación siguen valiendo), y sus
// imports relativos se reescriben a esas copias.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

// import … from './x' · export … from './x' · import './x' · import('./x')
export const IMPORT_RELATIVO = /((?:import|export)\s[^'"`;]*?\sfrom\s*|import\s*\(\s*|import\s+)(['"])(\.{1,2}\/[^'"]+)\2/g

export const nombreCopia = (rel, etiqueta) => path.join(path.dirname(rel), `.ref-${etiqueta}--${path.basename(rel)}`)

export function extraerReferencia({ raiz, ref, entrada, etiqueta, leer = rel => execFileSync('git', ['show', `${ref}:${rel}`], { cwd: raiz, maxBuffer: 64e6 }).toString() }) {
  const fuentes = new Map()
  const pendientes = [path.normalize(entrada)]

  while (pendientes.length) {
    const rel = pendientes.pop()

    if (fuentes.has(rel)) continue
    const src = leer(rel)

    fuentes.set(rel, src)

    for (const m of src.matchAll(IMPORT_RELATIVO)) {
      const dep = path.normalize(path.join(path.dirname(rel), m[3]))

      if (!fuentes.has(dep)) pendientes.push(dep)
    }
  }

  const archivos = []

  for (const [rel, src] of fuentes) {
    const reescrito = src.replace(IMPORT_RELATIVO, (_, pre, q, esp) => {
      const dep = path.normalize(path.join(path.dirname(rel), esp))
      const destino = path.relative(path.dirname(rel), nombreCopia(dep, etiqueta))

      // `.ref-…` empieza con punto pero NO es relativo: sin `./` Node lo buscaría como paquete.
      return `${pre}${q}${destino.startsWith('./') || destino.startsWith('../') ? destino : `./${destino}`}${q}`
    })

    const archivo = path.join(raiz, nombreCopia(rel, etiqueta))

    fs.writeFileSync(archivo, reescrito)
    archivos.push(archivo)
  }

  return { entrada: path.join(raiz, nombreCopia(path.normalize(entrada), etiqueta)), archivos, dependencias: [...fuentes.keys()] }
}
