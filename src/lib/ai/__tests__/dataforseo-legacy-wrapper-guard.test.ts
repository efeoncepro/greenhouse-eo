import { execSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1696 — Nadie vuelve a comprar por la puerta que no atribuye.
 *
 * El wrapper histórico del AEO en `src/lib/ai/dataforseo.ts` está congelado: no acepta
 * `organizationId`, así que todo lo que compre por ahí queda FUERA del ledger aunque el perfil
 * tenga organización. Ése era el punto ciego que esta task cerró migrando su único consumer
 * productivo —el adapter de AI Mode— al transporte canónico `postDataForSeoTask`.
 *
 * El riesgo real no es que alguien lo rompa a propósito: es que el próximo consumer AEO copie el
 * import del adapter de una versión vieja del archivo y reabra el punto ciego sin que nada falle
 * (el gasto ocurre, el resultado llega, el ledger simplemente no lo ve). Este guard convierte eso
 * en un build rojo.
 *
 * Se mide sobre archivos TRACKEADOS por git para no depender de artefactos locales.
 */

const SYMBOL = ['postDataForSeo', 'SerpLiveAdvanced'].join('')

/**
 * ⚠️ El símbolo se compone en runtime y NO se escribe literal en este archivo: un guard que
 * contiene el patrón que persigue se encuentra a sí mismo. Por la misma razón el barrido descarta
 * las líneas de COMENTARIO — la primera versión de este test se puso roja por una explicación en
 * prosa dentro del adapter que sólo mencionaba el nombre.
 */
const productionUsages = (): string[] => {
  const output = execSync(`git grep -n '${SYMBOL}' -- 'src/**/*.ts' 'services/**/*.ts' || true`, {
    encoding: 'utf8'
  })

  const files = output
    .split('\n')
    .filter(Boolean)
    .filter(line => {
      const code = line.split(':').slice(2).join(':').trim()

      return !code.startsWith('*') && !code.startsWith('//') && !code.startsWith('/*')
    })
    .map(line => line.split(':')[0] ?? '')
    .filter(Boolean)
    .filter(file => !file.includes('__tests__'))
    // El propio transporte lo define; ése no es un consumer.
    .filter(file => file !== 'src/lib/ai/dataforseo.ts')

  return [...new Set(files)]
}

describe('guard del wrapper legacy sin atribución (TASK-1696)', () => {
  it('ningún módulo productivo compra por el wrapper congelado sin atribución', () => {
    // Si esto falla: tu consumer necesita atribuir gasto. Usa `postDataForSeoTask` con
    // `family: 'serp'`, `consumer` explícito y `organizationId` cuando exista — NO agregues
    // parámetros al wrapper congelado ni relajes este test.
    //
    expect(productionUsages()).toEqual([])
  })
})
