import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'

/**
 * TASK-1693 Slice 3 — ninguna clave de copy de la lente `Descubrir` sin consumidor.
 *
 * **Por qué existe esta guarda.** Un contrato sin consumer no es una feature pendiente: es una
 * afirmación falsa sobre lo que la pantalla hace, y el próximo agente la lee como verdad. La
 * lente llegó a acumular 13 claves escritas, revisadas y jamás renderizadas —todo el vocabulario
 * de fuentes de seed entre ellas—, así que alguien podía leer `sourceGscHelper` y concluir que
 * la superficie ofrecía Search Console cuando el workbench mandaba `'manual'` fijo.
 *
 * ⚠️ **Instrumento y sus límites, declarados.** Esto es análisis estático: la única forma de
 * saber si una clave se referencia es buscarla en el árbol. No encoda un modelo del
 * comportamiento (ni un conteo de apariciones ni una lista fija de claves): las claves se
 * DESCUBREN recorriendo el objeto real, así que agregar una nueva la mete al barrido sola. Lo
 * que NO puede ver: una clave referenciada en código muerto, o una renderizada por una ruta que
 * nadie visita. Para eso está el GVC, que mira la pantalla.
 */

/** Recorre el objeto de copy y devuelve el nombre de cada hoja. */
const collectLeafKeys = (node: unknown, acc: Set<string> = new Set()): Set<string> => {
  if (node === null || typeof node !== 'object') return acc

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (value !== null && typeof value === 'object') {
      collectLeafKeys(value, acc)
    } else {
      acc.add(key)
    }
  }

  return acc
}

/**
 * Claves cuyo consumidor legítimo vive fuera del alcance del grep de esta lente, con su razón.
 * NUNCA agregar una acá para "poner el test en verde": si una clave no se usa, se borra.
 */
const DECLARED_EXCEPTIONS = new Map<string, string>()

/**
 * UNA sola pasada por el árbol, no una por clave.
 *
 * La versión ingenua (un `grep` por clave) tardaba 76 s: 250 procesos sobre `src/`. Se lee el
 * árbol una vez, se excluye el propio archivo de copy y se buscan todos los `.identificador`.
 */
const collectReferencedKeys = (): Set<string> => {
  const files = execFileSync('grep', ['-rl', '--include=*.ts', '--include=*.tsx', '-e', '.', 'src'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
    .split('\n')
    .filter(file => file && !file.startsWith('src/lib/copy/'))

  const referenced = new Set<string>()

  const contents = execFileSync('cat', files, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

  for (const match of contents.matchAll(/\.([A-Za-z_$][A-Za-z0-9_$]*)/g)) {
    referenced.add(match[1])
  }

  return referenced
}

describe('GH_GROWTH_SEO_KEYWORDS.discovery — cero copy sin consumidor', () => {
  it('cada clave de la lente se renderiza en algún componente', () => {
    const keys = [...collectLeafKeys(GH_GROWTH_SEO_KEYWORDS.discovery)]

    expect(keys.length).toBeGreaterThan(0)

    const referenced = collectReferencedKeys()
    const orphans = keys.filter(key => !DECLARED_EXCEPTIONS.has(key) && !referenced.has(key))

    expect(orphans, `Claves sin consumidor: ${orphans.join(', ')}. Se cablean o se borran.`).toEqual([])
  })
})
