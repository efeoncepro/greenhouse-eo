import { describe, expect, it } from 'vitest'

import { searchKnowledge } from './search-knowledge'
import { KNOWLEDGE_SEARCH_CONTRACT_VERSION, type KnowledgeSearchSubject } from './types'

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

// Read-only contra el corpus gobernado (TASK-1082 base + TASK-1140 manuales
// operativos). El MANUAL legacy "Períodos de nómina" sigue `agent_excluded` → es el
// caso canónico de las dos dimensiones ortogonales; el doc FUNCIONAL de nómina
// (TASK-1140, agent_allowed) SÍ es citable en agentic. Skipped en CI (no PG) — local.
const internalSubject: KnowledgeSearchSubject = {
  userId: 'user-agent-e2e-001',
  tenantType: 'efeonce_internal',
  tenantId: null,
  roleCodes: ['efeonce_admin', 'collaborator'],
  routeGroups: ['internal'],
  capabilities: ['knowledge.document.read', 'knowledge.agentic.retrieve']
}

const PAYROLL_QUERY = 'periodos de nomina'

const hasPayrollDoc = (titles: string[]) =>
  titles.some(title => title.toLowerCase().includes('nómina') || title.toLowerCase().includes('nomina'))

describe.skipIf(!hasPgConfig)('searchKnowledge — live PG (TASK-1083)', () => {
  it('returns a versioned packet with access scope echoed', async () => {
    const packet = await searchKnowledge({ query: PAYROLL_QUERY, subject: internalSubject, mode: 'human' })

    expect(packet.contractVersion).toBe(KNOWLEDGE_SEARCH_CONTRACT_VERSION)
    expect(packet.mode).toBe('human')
    expect(packet.query).toBe(PAYROLL_QUERY)
    expect(packet.accessScope.userId).toBe('user-agent-e2e-001')
    expect(packet.accessScope.tenantType).toBe('efeonce_internal')
    expect(typeof packet.generatedAt).toBe('string')
  })

  it('human mode SEES the agent_excluded payroll doc', async () => {
    const packet = await searchKnowledge({ query: PAYROLL_QUERY, subject: internalSubject, mode: 'human' })

    expect(packet.chunks.length).toBeGreaterThan(0)
    expect(packet.confidence).not.toBe('none')
    expect(hasPayrollDoc(packet.chunks.map(c => c.title))).toBe(true)

    // Each chunk carries a usable citation + human URL + a real relevance score.
    for (const chunk of packet.chunks) {
      expect(chunk.citationLabel.length).toBeGreaterThan(0)
      expect(chunk.humanUrl.length).toBeGreaterThan(0)
      expect(chunk.text.length).toBeGreaterThan(0)
      expect(typeof chunk.score).toBe('number')
      expect(chunk.score).toBeGreaterThan(0)
    }

    // NOTA (TASK-1140): el packet NO está ordenado por `chunk.score` desc cuando el
    // rerank (TASK-1124) está activo — el rerank reordena por un score compuesto
    // (heading + freshness + diversidad) y NO muta `chunk.score` (sigue siendo el
    // ts_rank que la UI muestra). Por eso solo aseveramos que cada chunk trae un
    // score positivo (arriba), no un orden monotónico del FTS rank.
  })

  it('agentic returns the agent_allowed payroll doc and FILTERS the agent_excluded manual', async () => {
    const packet = await searchKnowledge({ query: PAYROLL_QUERY, subject: internalSubject, mode: 'agentic' })

    // TASK-1140 (operador, opción A): el doc FUNCIONAL de nómina (agent_allowed) SÍ
    // se retorna en agentic; el MANUAL legacy (agent_excluded) se filtra → cuenta
    // como denegado. El contenido denegado NUNCA entra al packet.
    expect(hasPayrollDoc(packet.chunks.map(c => c.title))).toBe(true)
    expect(packet.deniedOrFilteredCount).toBeGreaterThanOrEqual(1)

    for (const chunk of packet.chunks) {
      expect(chunk.sensitivity).toBe('internal')
    }
  })

  it('empty query => confidence none, no chunks, honest note', async () => {
    const packet = await searchKnowledge({ query: '   ', subject: internalSubject, mode: 'human' })

    expect(packet.confidence).toBe('none')
    expect(packet.chunks).toHaveLength(0)
    expect(packet.notes.join(' ')).toMatch(/vacía/i)
  })

  it('no-match query => confidence none (no-answer honesto)', async () => {
    const packet = await searchKnowledge({
      query: 'zzqqx nonexistent gibberish 90909 wxyz',
      subject: internalSubject,
      mode: 'human'
    })

    expect(packet.confidence).toBe('none')
    expect(packet.chunks).toHaveLength(0)
    expect(packet.notes.join(' ')).toMatch(/no se encontró/i)
  })

  it('respects the limit', async () => {
    const packet = await searchKnowledge({
      query: PAYROLL_QUERY,
      subject: internalSubject,
      mode: 'human',
      limit: 2
    })

    expect(packet.chunks.length).toBeLessThanOrEqual(2)
  })
})
