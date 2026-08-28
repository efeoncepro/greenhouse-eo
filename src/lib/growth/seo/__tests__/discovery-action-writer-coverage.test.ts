import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1692 — el guard que habría cazado el hallazgo ANTES de que llegara a producción.
 *
 * El defecto original: de los cinco `action_kind` que el dominio declaraba, sólo UNO tenía
 * writer. Los otros existían en el enum, en el `switch` que pinta el estado del candidato y en
 * el guard del bridge — y nadie los escribía nunca. El resultado era un estado de UI
 * inalcanzable y un inbox ordenado al revés de la realidad.
 *
 * Un vocabulario sin dueño no falla: simplemente nunca pasa nada. Por eso hace falta un test
 * que lo declare imposible.
 */

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8')

const CONTRACTS = read('src/lib/growth/seo/keyword-discovery/contracts.ts')

/** Dueño declarado de cada kind vigente. Agregar un kind sin dueño rompe este test. */
const WRITERS: Record<string, { writer: string; evidence: { file: string; needle: string } }> = {
  dismissed: {
    writer: 'consumer — decisión humana pura vía record_action',
    evidence: {
      file: 'src/views/greenhouse/admin/growth/seo/keywords/discovery/keyword-discovery-action.ts',
      needle: "actionKind: 'dismissed'"
    }
  },
  rejected: {
    writer: 'consumer — decisión humana pura vía record_action',
    evidence: {
      file: 'src/lib/growth/seo/keyword-discovery/contracts.ts',
      needle: 'SEO_DISCOVERY_CONSUMER_ACTION_KINDS'
    }
  },
  selected_for_grounded_query: {
    writer: 'createGroundedQueryDraft (+ re-selección humana explícita)',
    evidence: {
      file: 'src/lib/growth/seo/grounded-query-bridge.ts',
      needle: "actionKind: 'selected_for_grounded_query'"
    }
  },
  promoted_to_tracking: {
    writer: 'applyKeywordTracking, en la misma transacción que abre la membresía',
    evidence: {
      file: 'src/lib/growth/seo/track-keywords.ts',
      needle: "actionKind: 'promoted_to_tracking'"
    }
  }
}

/**
 * Lee un enum runtime del contrato sin importar el módulo (que es `server-only`).
 *
 * ⚠️ Se corta en `= [` y NO en el nombre de la constante: la anotación de tipo lleva su propio
 * `[]` (`readonly SeoDiscoveryActionKind[]`), así que partir por el primer `]` devolvía la
 * anotación en vez del array — y una lista vacía habría hecho pasar el test por vacuidad.
 */
const literalsOf = (constantName: string): string[] => {
  const afterName = CONTRACTS.split(`export const ${constantName}`)[1] ?? ''
  const block = afterName.split('= [')[1]?.split(']')[0] ?? ''

  return [...block.matchAll(/'([a-z_]+)'/g)].map(match => match[1])
}

const declaredKinds = (): string[] => literalsOf('SEO_DISCOVERY_ACTION_KINDS')

describe('TASK-1692 — todo action_kind del vocabulario tiene un writer declarado', () => {
  it('el enum y la tabla de dueños coinciden exactamente', () => {
    // Si alguien agrega un kind y no declara quién lo escribe, este test se lo dice acá y no
    // seis meses después, cuando alguien note que un estado de la lente nunca aparece.
    expect(declaredKinds().length).toBeGreaterThan(0)
    expect(declaredKinds().sort()).toEqual(Object.keys(WRITERS).sort())
  })

  it('cada kind tiene evidencia de su writer en el código', () => {
    for (const [kind, { evidence }] of Object.entries(WRITERS)) {
      expect(read(evidence.file), `${kind} declara writer en ${evidence.file}`).toContain(evidence.needle)
    }
  })

  it('🔴 `selected_for_target` quedó retirado del vocabulario, con su razón escrita', () => {
    expect(declaredKinds()).not.toContain('selected_for_target')
    // El CHECK de la base lo CONSERVA: una fila histórica debe seguir siendo legible.
    expect(read('migrations/20260814140033339_task-1664-seo-keyword-discovery.sql')).toContain('selected_for_target')
    expect(CONTRACTS).toContain('`selected_for_target` se retiró de este vocabulario')
  })
})

describe('TASK-1692 — ningún consumer escribe lo que produce un command', () => {
  const CONSUMER_ONLY_FILES = [
    'src/app/api/admin/growth/seo/keyword-discovery/route.ts',
    'src/lib/api-platform/resources/ecosystem-growth-seo.ts',
    'src/views/greenhouse/admin/growth/seo/keywords/discovery/keyword-discovery-action.ts'
  ]

  it('las rutas y la vista NO escriben promoted_to_tracking por su cuenta', () => {
    for (const file of CONSUMER_ONLY_FILES) {
      // Encadenar un `record_action` después del éxito de un command deja el ledger a merced
      // de que cada cliente se acuerde, y parte la verdad en dos cuando la segunda llamada falla.
      expect(read(file), `${file} no escribe el kind del command`).not.toContain("'promoted_to_tracking'")
    }
  })

  it('los dos lanes validan contra el vocabulario de CONSUMER, no contra el enum completo', () => {
    for (const file of [CONSUMER_ONLY_FILES[0], CONSUMER_ONLY_FILES[1]]) {
      expect(read(file)).toContain('SEO_DISCOVERY_CONSUMER_ACTION_KINDS')
      expect(read(file)).not.toContain('SEO_DISCOVERY_ACTION_KINDS.includes')
    }
  })

  it('`promoted_to_tracking` NO es escribible por un consumer', () => {
    const consumerKinds = literalsOf('SEO_DISCOVERY_CONSUMER_ACTION_KINDS')

    // Guard anti-vacuidad: una lista vacía haría pasar el `not.toContain` por la razón
    // equivocada — el mismo modo de falla que este archivo existe para cerrar.
    expect(consumerKinds.length).toBeGreaterThan(0)
    expect(consumerKinds).not.toContain('promoted_to_tracking')
    expect(consumerKinds).toContain('dismissed')
  })
})
