/**
 * TASK-1772 — la allowlist de purga acotada.
 *
 * Estos tests fijan la parte que DECIDE qué se muta sobre la única instancia Cloud SQL compartida
 * por dev, staging y producción. Existen para que quitar una guarda cueste romper un test, no para
 * documentar que existió.
 */
import { describe, expect, it } from 'vitest'

import {
  countPurgeAllowlistEntries,
  findPurgeAllowlistEntriesOutsidePlan,
  PURGE_ALLOWLIST_SUFFIX,
  type PurgeAllowlist,
} from './purge'

const plan = {
  candidates: [
    { applicationId: 'happ-a' },
    { applicationId: 'happ-b' },
  ],
  facets: [{ candidateFacetId: 'cndf-a' }],
  openings: [{ openingId: 'opng-a' }],
} as unknown as Parameters<typeof findPurgeAllowlistEntriesOutsidePlan>[1]

describe('countPurgeAllowlistEntries', () => {
  it('suma las TRES entidades: podar sólo una no vacía la allowlist', () => {
    expect(countPurgeAllowlistEntries({ applicationIds: ['x'], openingIds: ['y'] })).toBe(2)
  })

  /**
   * Una allowlist vacía NO es «archivar todo». Es un error del operador —emitió y podó de más, o
   * apuntó al archivo equivocado— y el caller la trata como abort, no como no-op.
   */
  it('una allowlist vacía cuenta 0, para que el caller pueda abortar en vez de archivar todo', () => {
    expect(countPurgeAllowlistEntries({})).toBe(0)
    expect(countPurgeAllowlistEntries({ applicationIds: [], candidateFacetIds: [], openingIds: [] })).toBe(0)
  })
})

describe('findPurgeAllowlistEntriesOutsidePlan', () => {
  it('una allowlist enteramente dentro del plan no reporta nada', () => {
    const allowlist: PurgeAllowlist = { applicationIds: ['happ-a'], openingIds: ['opng-a'] }

    expect(findPurgeAllowlistEntriesOutsidePlan(allowlist, plan)).toEqual([])
  })

  /**
   * Devuelve TODAS las desconocidas, no la primera: fallar de a una obliga a N corridas para
   * descubrir N problemas sobre una base que otros están mutando en paralelo.
   */
  it('reporta TODAS las ids fuera del plan, no sólo la primera', () => {
    const allowlist: PurgeAllowlist = {
      applicationIds: ['happ-a', 'happ-fantasma', 'happ-otra'],
      openingIds: ['opng-fantasma'],
    }

    const unknown = findPurgeAllowlistEntriesOutsidePlan(allowlist, plan)

    expect(unknown).toHaveLength(3)
    expect(unknown).toContain('applicationIds: happ-fantasma')
    expect(unknown).toContain('applicationIds: happ-otra')
    expect(unknown).toContain('openingIds: opng-fantasma')
  })

  /**
   * Una id VÁLIDA de otra entidad sigue siendo inválida en la suya. Sin esto, un copy-paste entre
   * listas pasaría la validación y archivaría la entidad equivocada.
   */
  it('no cruza entidades: una id de vacante en la lista de postulaciones es desconocida', () => {
    expect(findPurgeAllowlistEntriesOutsidePlan({ applicationIds: ['opng-a'] }, plan)).toEqual([
      'applicationIds: opng-a',
    ])
  })

  it('omitir una lista significa «ninguna», nunca «todas»', () => {
    expect(findPurgeAllowlistEntriesOutsidePlan({ applicationIds: ['happ-a'] }, plan)).toEqual([])
  })
})

describe('PURGE_ALLOWLIST_SUFFIX', () => {
  /**
   * El sufijo es lo que ata el archivo al `.gitignore`. Si cambia acá sin cambiar allá, una
   * allowlist con ids de registros de la base compartida se vuelve committeable.
   */
  it('coincide con el patrón gitignoreado', () => {
    expect(PURGE_ALLOWLIST_SUFFIX).toBe('.synthetic-purge-allowlist.json')
  })
})
