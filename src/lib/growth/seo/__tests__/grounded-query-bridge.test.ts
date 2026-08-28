import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1666 — Bridge SEO → grounded queries AEO.
 *
 * Cubre las fronteras que hacen seguro el puente: flags y doble capability, tenant/anti-oracle
 * (profile ajeno, candidate ajeno, run↔target inconsistente), límites (≤20, sin duplicados),
 * estados de candidato, brand context autorizado (jamás inventado), hash canónico del contexto,
 * idempotencia (draft existente ⇒ cero segunda autoría), fallback honesto etiquetado y la regla
 * de oro: el bridge SOLO crea draft — jamás approve, jamás run, jamás SQL cross-motor.
 */

vi.mock('server-only', () => ({}))

const canMock = vi.fn()

vi.mock('@/lib/entitlements/runtime', () => ({
  can: (...args: unknown[]) => canMock(...args)
}))

const state = {
  profile: null as Record<string, unknown> | null,
  brandIntelligence: null as Record<string, unknown> | null,
  discovery: null as Record<string, unknown> | null,
  existingVersions: [] as Array<Record<string, unknown>>,
  authorResult: null as Record<string, unknown> | null,
  authorCalls: [] as Array<Record<string, unknown>>,
  sqlCalls: [] as string[],
  /** TASK-1692 — llamadas al ledger con sus params, para verificar metadata e idempotencia. */
  ledgerInserts: [] as unknown[][],
  /** `false` simula que el candidato no pertenece a la org (append devuelve run_not_found). */
  candidateVisible: true,
  /** Simula un fallo DURO del append (conexión caída) para probar el residuo declarado. */
  ledgerThrows: false
}

vi.mock('@/lib/growth/ai-visibility/store', () => ({
  getGraderProfile: async () => state.profile
}))

vi.mock('@/lib/growth/ai-visibility/brand-intelligence/store', () => ({
  getActiveBrandIntelligence: async () => state.brandIntelligence
}))

vi.mock('@/lib/growth/ai-visibility/prompt-packs/prompt-set-command', () => ({
  authorGraderPromptSetDraft: async (input: Record<string, unknown>) => {
    state.authorCalls.push(input)

    return state.authorResult
  },
  readGraderPromptSets: async () => ({ active: null, versions: state.existingVersions })
}))

const flags = { seo: true, grader: true, authoring: true }

vi.mock('@/lib/growth/seo/flags', () => ({
  isSeoModuleEnabled: () => flags.seo
}))

vi.mock('@/lib/growth/ai-visibility/flags', () => ({
  isGraderEnabled: () => flags.grader,
  isPromptAuthoringEnabled: () => flags.grader && flags.authoring
}))

const readDiscoveryMock = vi.fn()

vi.mock('@/lib/growth/seo/keyword-discovery/reader', () => ({
  readKeywordDiscovery: (...args: unknown[]) => readDiscoveryMock(...args)
}))

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: async (fn: (client: unknown) => Promise<unknown>) =>
    fn({
      query: async (sql: string, params: unknown[] = []) => {
        state.sqlCalls.push(sql)

        // Chequeo de tenant del append: el candidato existe y es de la org.
        if (sql.includes('SELECT candidate_id') && sql.includes('seo_keyword_discovery_candidates')) {
          return { rows: state.candidateVisible ? [{ candidate_id: params[0] }] : [], rowCount: 0 }
        }

        if (sql.includes('INSERT INTO greenhouse_growth.seo_keyword_discovery_actions')) {
          if (state.ledgerThrows) throw new Error('connection terminated')

          state.ledgerInserts.push(params)

          return { rows: [{ action_id: `seokda-${state.ledgerInserts.length}` }], rowCount: 1 }
        }

        return { rows: [], rowCount: 0 }
      }
    })
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import {
  computeSeoGroundingContextRef,
  createGroundedQueryDraft,
  GROUNDED_QUERY_COVERAGE_NOTICE,
  GROUNDED_QUERY_DECISION_LOG_NOTICE,
  GROUNDED_QUERY_FALLBACK_NOTICE
} from '../grounded-query-bridge'

const subject = { userId: 'user-1', roleCodes: ['efeonce_admin'] } as never

const candidateView = (overrides: Record<string, unknown> = {}) => {
  const base = {
    candidateId: 'seokdc-1',
    runId: 'seokdr-1',
    keyword: 'pintura para piso',
    normalizedKeyword: 'pintura para piso',
    sourceEndpoint: 'keyword_suggestions',
    sourceRank: 1,
    capturedAt: '2026-08-14T12:00:00.000Z',
    coreKeyword: 'pintura para piso',
    intent: 'commercial',
    searchVolume: 1000,
    difficulty: 10,
    latestAction: null,
    ...overrides
  }

  // TASK-1694: el reader colapsa por keyword; `candidateIds` lleva TODAS las procedencias.
  // Por default una sola, igual que un candidato hallado por un único método.
  return { candidateIds: [base.candidateId], ...base }
}

const draftRow = (overrides: Record<string, unknown> = {}) => ({
  setId: 'set-1',
  profileId: 'prof-1',
  version: 3,
  status: 'draft',
  generationStrategy: 'llm',
  systemPromptVersion: 'aeo-author.seo-grounded.v2',
  groundingSources: ['category:Pinturas', 'seo.discovery.run:seokdr-1', 'seo.discovery.candidate:seokdc-1'],
  prompts: [],
  createdBy: 'user-1',
  createdAt: '2026-08-14T12:05:00.000Z',
  approvedBy: null,
  approvedAt: null,
  businessModel: 'consumer_b2c',
  categoryNodeId: null,
  model: 'gemini-x',
  ...overrides
})

const baseInput = {
  subject,
  organizationId: 'org-1',
  profileId: 'prof-1',
  seoTargetId: 'seot-1',
  discoveryRunId: 'seokdr-1',
  candidateIds: ['seokdc-1'],
  createdBy: 'user-1'
}

beforeEach(() => {
  canMock.mockReset().mockReturnValue(true)
  readDiscoveryMock.mockReset()
  state.profile = {
    profileId: 'prof-1',
    organizationId: 'org-1',
    brandName: 'Berel',
    market: 'México',
    locale: 'es-MX',
    categoryNodeId: 'industry:paint',
    categoryLabel: 'Pinturas',
    businessModel: 'consumer_b2c',
    competitorsDeclared: ['Comex']
  }
  state.brandIntelligence = { whatTheBrandDoes: 'Fabrica pinturas', fineCategory: null }
  state.discovery = {
    ok: true,
    run: { runId: 'seokdr-1', seoTargetId: 'seot-1' },
    candidates: [candidateView()]
  }
  state.existingVersions = []
  state.authorResult = { draft: draftRow(), authoringStatus: 'ok' }
  state.authorCalls = []
  state.sqlCalls = []
  state.ledgerInserts = []
  state.candidateVisible = true
  state.ledgerThrows = false
  flags.seo = true
  flags.grader = true
  flags.authoring = true
  readDiscoveryMock.mockImplementation(async () => state.discovery)
})

describe('computeSeoGroundingContextRef', () => {
  it('produce sha256 estable con candidates ordenados por candidateId', () => {
    const shape = {
      runId: 'seokdr-1',
      seoTargetId: 'seot-1',
      market: 'México',
      locale: 'es-MX',
      candidates: [
        {
          candidateId: 'b',
          normalizedKeyword: 'kw b',
          sourceEndpoint: 'keyword_ideas',
          coreKeyword: null,
          intent: null,
          searchVolume: null,
          keywordDifficulty: null,
          capturedAt: '2026-08-14T00:00:00.000Z'
        },
        {
          candidateId: 'a',
          normalizedKeyword: 'kw a',
          sourceEndpoint: 'keyword_suggestions',
          coreKeyword: 'kw a',
          intent: 'commercial',
          searchVolume: 10,
          keywordDifficulty: 0,
          capturedAt: '2026-08-14T00:00:00.000Z'
        }
      ]
    }

    const ref = computeSeoGroundingContextRef(shape)

    const refReordered = computeSeoGroundingContextRef({
      ...shape,
      candidates: [...shape.candidates].reverse()
    })

    expect(ref).toMatch(/^seo\.discovery\.context:[0-9a-f]{64}$/)
    // El orden de entrada NO cambia el hash (orden canónico por candidateId).
    expect(refReordered).toBe(ref)
    // Cambiar un dato del contexto SÍ cambia el hash.
    expect(
      computeSeoGroundingContextRef({ ...shape, market: 'Chile' })
    ).not.toBe(ref)
  })
})

describe('createGroundedQueryDraft — gates', () => {
  it('flag OFF (grader) → grounded_query_disabled sin tocar nada', async () => {
    flags.grader = false

    const result = await createGroundedQueryDraft(baseInput)

    expect(result).toEqual({ ok: false, errorCode: 'grounded_query_disabled', status: 409 })
    expect(readDiscoveryMock).not.toHaveBeenCalled()
  })

  it('sin capability SEO → seo_forbidden; sin capability AEO → aeo_forbidden', async () => {
    canMock.mockImplementation((_subject: unknown, capability: string) => capability !== 'growth.seo.observation.read')

    expect(await createGroundedQueryDraft(baseInput)).toMatchObject({ ok: false, errorCode: 'seo_forbidden' })

    canMock.mockImplementation(
      (_subject: unknown, capability: string) => capability !== 'growth.ai_visibility.prompt_set.manage'
    )

    expect(await createGroundedQueryDraft(baseInput)).toMatchObject({ ok: false, errorCode: 'aeo_forbidden' })
  })

  it('límite de 20 y duplicados se rechazan tipados', async () => {
    const many = Array.from({ length: 21 }, (_, index) => `seokdc-${index}`)

    expect(await createGroundedQueryDraft({ ...baseInput, candidateIds: many })).toMatchObject({
      errorCode: 'candidate_limit_exceeded'
    })

    expect(
      await createGroundedQueryDraft({ ...baseInput, candidateIds: ['seokdc-1', 'seokdc-1'] })
    ).toMatchObject({ errorCode: 'duplicate_candidate' })
  })

  it('profile ajeno o inexistente responden LO MISMO (anti-oracle)', async () => {
    state.profile = null

    const missing = await createGroundedQueryDraft(baseInput)

    state.profile = { profileId: 'prof-1', organizationId: 'org-AJENA' }

    const foreign = await createGroundedQueryDraft(baseInput)

    expect(missing).toEqual({ ok: false, errorCode: 'profile_not_found', status: 404 })
    expect(foreign).toEqual(missing)
  })

  it('brand context incompleto (businessModel unknown) → invalid_context, jamás se inventa', async () => {
    state.profile = { ...(state.profile as object), businessModel: 'unknown' } as never

    const result = await createGroundedQueryDraft(baseInput)

    expect(result).toMatchObject({ ok: false, errorCode: 'invalid_context' })
    expect(state.authorCalls).toHaveLength(0)
  })

  it('candidate inexistente en la corrida → candidate_not_found sin revelar cuál', async () => {
    const result = await createGroundedQueryDraft({ ...baseInput, candidateIds: ['seokdc-1', 'seokdc-ajeno'] })

    expect(result).toEqual({ ok: false, errorCode: 'candidate_not_found', status: 404 })
  })

  it('TASK-1694: un id de procedencia NO representativa sigue resolviendo tras el colapso', async () => {
    // La keyword la hallaron dos métodos; el reader la sirve como UNA fila cuyo representante
    // es `seokdc-1`. Seleccionar por la otra procedencia es legítimo y no puede dar 404.
    state.discovery = {
      ok: true,
      run: { runId: 'seokdr-1', seoTargetId: 'seot-1' },
      candidates: [candidateView({ candidateIds: ['seokdc-1', 'seokdc-2'] })]
    }

    const result = await createGroundedQueryDraft({ ...baseInput, candidateIds: ['seokdc-2'] })

    expect(result).toMatchObject({ ok: true })
  })

  it('TASK-1694: dos procedencias de la MISMA keyword son una sola intención en el contexto', async () => {
    state.discovery = {
      ok: true,
      run: { runId: 'seokdr-1', seoTargetId: 'seot-1' },
      candidates: [candidateView({ candidateIds: ['seokdc-1', 'seokdc-2'] })]
    }

    const result = await createGroundedQueryDraft({ ...baseInput, candidateIds: ['seokdc-1', 'seokdc-2'] })

    expect(result).toMatchObject({ ok: true })

    const call = state.authorCalls.at(-1) as { seoContext: { candidates: unknown[] } }

    // Una keyword, una pregunta: duplicarla pediría dos veces lo mismo al autor.
    expect(call.seoContext.candidates).toHaveLength(1)
  })

  it('run de otro target → cross_tenant', async () => {
    state.discovery = { ...(state.discovery as object), run: { runId: 'seokdr-1', seoTargetId: 'seot-OTRO' } } as never

    expect(await createGroundedQueryDraft(baseInput)).toMatchObject({ errorCode: 'cross_tenant' })
  })

  it('candidato dismissed sin re-selección → invalid_context', async () => {
    state.discovery = {
      ok: true,
      run: { runId: 'seokdr-1', seoTargetId: 'seot-1' },
      candidates: [candidateView({ latestAction: { kind: 'dismissed', actor: 'x', at: 'y' } })]
    }

    expect(await createGroundedQueryDraft(baseInput)).toMatchObject({ errorCode: 'invalid_context' })
  })

  it('candidato re-seleccionado (selected_for_grounded_query) SÍ entra', async () => {
    state.discovery = {
      ok: true,
      run: { runId: 'seokdr-1', seoTargetId: 'seot-1' },
      candidates: [candidateView({ latestAction: { kind: 'selected_for_grounded_query', actor: 'x', at: 'y' } })]
    }

    expect((await createGroundedQueryDraft(baseInput)).ok).toBe(true)
  })
})

describe('createGroundedQueryDraft — creación y honestidad', () => {
  it('happy path grounded: pasa contexto delimitable al command AEO y devuelve grounded_llm', async () => {
    state.authorResult = {
      draft: draftRow({ prompts: [{ text: '¿Qué pintura para pisos de garage me recomiendas?' }] }),
      authoringStatus: 'ok'
    }

    const result = await createGroundedQueryDraft(baseInput)

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.groundingMode).toBe('grounded_llm')
    expect(result.fallbackNotice).toBeNull()
    expect(result.deduped).toBe(false)

    // v2 (auditoría B1): la cobertura por seed se VERIFICA, no se asume por la etiqueta grounded.
    expect(result.seedCoverage).toEqual({ coveredCandidateIds: ['seokdc-1'], uncoveredCandidateIds: [] })
    expect(result.coverageNotice).toBeNull()

    // El command AEO recibió el brand context AUTORIZADO del profile + el contexto SEO con hash.
    const call = state.authorCalls[0]

    expect(call.brandName).toBe('Berel')
    expect(call.businessModel).toBe('consumer_b2c')
    expect((call.seoContext as { contextRef: string }).contextRef).toMatch(/^seo\.discovery\.context:[0-9a-f]{64}$/)
    expect((call.seoContext as { candidates: unknown[] }).candidates).toHaveLength(1)

    // Serialización: el advisory lock transaccional se tomó antes de autorar.
    expect(state.sqlCalls.some(sql => sql.includes('pg_advisory_xact_lock'))).toBe(true)
  })

  it('fallback honesto: authoringStatus != ok ⇒ baseline_fallback + aviso obligatorio', async () => {
    state.authorResult = {
      draft: draftRow({ generationStrategy: 'template_baseline', systemPromptVersion: null }),
      authoringStatus: 'disabled'
    }

    const result = await createGroundedQueryDraft(baseInput)

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.groundingMode).toBe('baseline_fallback')
    expect(result.fallbackNotice).toBe(GROUNDED_QUERY_FALLBACK_NOTICE)

    // El baseline no promete cobertura por seed: la señal viaja como null, no como [].
    expect(result.seedCoverage).toBeNull()
    expect(result.coverageNotice).toBeNull()
  })

  it('v2 (auditoría B1): seed sin huella temática en el draft grounded ⇒ coverageNotice declarado', async () => {
    // El caso real del smoke v1: el set autorado no dejó NINGUNA pregunta de "pintura para piso".
    state.authorResult = {
      draft: draftRow({ prompts: [{ text: '¿Qué recubrimiento epóxico me recomiendas para un taller?' }] }),
      authoringStatus: 'ok'
    }

    const result = await createGroundedQueryDraft(baseInput)

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.groundingMode).toBe('grounded_llm')
    expect(result.seedCoverage?.uncoveredCandidateIds).toEqual(['seokdc-1'])
    expect(result.coverageNotice).toBe(GROUNDED_QUERY_COVERAGE_NOTICE)
  })

  it('idempotencia: draft existente del mismo contexto ⇒ deduped, CERO segunda autoría', async () => {
    // Pre-computar el contextRef real que el bridge derivará de este candidato.
    const contextRef = computeSeoGroundingContextRef({
      runId: 'seokdr-1',
      seoTargetId: 'seot-1',
      market: 'México',
      locale: 'es-MX',
      candidates: [
        {
          candidateId: 'seokdc-1',
          normalizedKeyword: 'pintura para piso',
          sourceEndpoint: 'keyword_suggestions',
          coreKeyword: 'pintura para piso',
          intent: 'commercial',
          searchVolume: 1000,
          keywordDifficulty: 10,
          capturedAt: '2026-08-14T12:00:00.000Z'
        }
      ]
    })

    state.existingVersions = [draftRow({ groundingSources: ['category:Pinturas', contextRef] })]

    const result = await createGroundedQueryDraft(baseInput)

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.deduped).toBe(true)
    expect(state.authorCalls).toHaveLength(0)
  })

  it('un draft baseline previo NO bloquea re-generar grounded con el authoring disponible', async () => {
    const contextRef = computeSeoGroundingContextRef({
      runId: 'seokdr-1',
      seoTargetId: 'seot-1',
      market: 'México',
      locale: 'es-MX',
      candidates: [
        {
          candidateId: 'seokdc-1',
          normalizedKeyword: 'pintura para piso',
          sourceEndpoint: 'keyword_suggestions',
          coreKeyword: 'pintura para piso',
          intent: 'commercial',
          searchVolume: 1000,
          keywordDifficulty: 10,
          capturedAt: '2026-08-14T12:00:00.000Z'
        }
      ]
    })

    state.existingVersions = [
      draftRow({ generationStrategy: 'template_baseline', systemPromptVersion: null, groundingSources: [contextRef] })
    ]

    // Con authoring DISPONIBLE: el baseline previo no dedupea — se re-genera grounded (lo que
    // el copy del fallback le prometió al operador).
    const regenerated = await createGroundedQueryDraft(baseInput)

    expect(regenerated.ok).toBe(true)

    if (!regenerated.ok) return

    expect(regenerated.deduped).toBe(false)
    expect(regenerated.groundingMode).toBe('grounded_llm')
    expect(state.authorCalls).toHaveLength(1)

    // Con authoring APAGADO: el mismo baseline sí dedupea (repetir no apila baselines).
    flags.authoring = false
    state.authorCalls = []

    const deduped = await createGroundedQueryDraft(baseInput)

    expect(deduped.ok).toBe(true)

    if (!deduped.ok) return

    expect(deduped.deduped).toBe(true)
    expect(deduped.groundingMode).toBe('baseline_fallback')
    expect(deduped.fallbackNotice).toBe(GROUNDED_QUERY_FALLBACK_NOTICE)
    expect(state.authorCalls).toHaveLength(0)
  })

  describe('TASK-1692 — el bridge deja su huella en el ledger de discovery', () => {
    /** Lee el `metadata_json` (param 6) del INSERT al ledger. */
    const metadataOf = (index = 0) => JSON.parse(String(state.ledgerInserts[index]?.[5] ?? '{}'))

    /** Lee la `idempotency_key` (param 5). */
    const keyOf = (index = 0) => String(state.ledgerInserts[index]?.[4] ?? '')

    it('un draft grounded escribe una fila por candidato, con metadata opaca', async () => {
      const result = await createGroundedQueryDraft(baseInput)

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.decisionLogged).toBe(true)
      expect(result.decisionLogNotice).toBeNull()
      expect(state.ledgerInserts).toHaveLength(1)

      // Param 3 = action_kind.
      expect(state.ledgerInserts[0][2]).toBe('selected_for_grounded_query')

      expect(metadataOf()).toEqual({
        groundingMode: 'grounded_llm',
        deduped: false,
        contextRef: expect.stringContaining('seo.discovery.context:'),
        draftId: 'set-1',
        runId: 'seokdr-1'
      })
    })

    it('🔴 la metadata NO lleva la keyword cruda ni prosa del proveedor', async () => {
      await createGroundedQueryDraft(baseInput)

      const serialized = JSON.stringify(metadataOf())

      // La keyword es dato NO confiable: viaja al authoring, jamás al log de decisiones.
      expect(serialized).not.toContain('pintura')
      expect(Object.keys(metadataOf()).sort()).toEqual([
        'contextRef',
        'deduped',
        'draftId',
        'groundingMode',
        'runId'
      ])
    })

    it('la clave de idempotencia sale del outcome DURABLE (draftId), no del actor', async () => {
      await createGroundedQueryDraft(baseInput)

      expect(keyOf()).toBe('grounded:set-1:seokdc-1')
      // La clave automática `candidateId:kind:actor` colapsaría el mismo candidato en dos
      // drafts distintos en UNA sola fila; ésta no.
      expect(keyOf()).not.toContain('user-1')
    })

    it('el camino deduped también escribe: repara un append anterior fallido', async () => {
      // Primer intento: el append falla duro y el draft queda sin fila.
      state.ledgerThrows = true

      const first = await createGroundedQueryDraft(baseInput)

      expect(first.ok).toBe(true)

      if (!first.ok) return

      expect(first.decisionLogged).toBe(false)
      expect(state.ledgerInserts).toHaveLength(0)

      // Segundo intento sobre el MISMO contexto: dedupea el draft y esta vez sí registra.
      // El `contextRef` se DERIVA con el mismo helper que usa el bridge, no se hardcodea:
      // un literal convertiría el test en el snapshot de un candidato en vez del contrato.
      const contextRef = computeSeoGroundingContextRef({
        runId: 'seokdr-1',
        seoTargetId: 'seot-1',
        market: 'México',
        locale: 'es-MX',
        candidates: [
          {
            candidateId: 'seokdc-1',
            normalizedKeyword: 'pintura para piso',
            sourceEndpoint: 'keyword_suggestions',
            coreKeyword: 'pintura para piso',
            intent: 'commercial',
            searchVolume: 1000,
            keywordDifficulty: 10,
            capturedAt: '2026-08-14T12:00:00.000Z'
          }
        ]
      })

      state.ledgerThrows = false
      state.existingVersions = [draftRow({ groundingSources: ['category:Pinturas', contextRef] })]

      const second = await createGroundedQueryDraft(baseInput)

      expect(second.ok).toBe(true)

      if (!second.ok) return

      expect(second.deduped).toBe(true)
      expect(second.decisionLogged).toBe(true)
      expect(state.ledgerInserts).toHaveLength(1)
      expect(metadataOf()).toMatchObject({ deduped: true })
    })

    it('🔴 si el append falla, el draft NO se descarta: se declara decisionLogged=false + aviso', async () => {
      state.ledgerThrows = true

      const result = await createGroundedQueryDraft(baseInput)

      expect(result.ok).toBe(true)

      if (!result.ok) return

      // El draft existe y ya pagó una llamada LLM: devolver error diría que no pasó nada.
      expect(result.draft).toBeDefined()
      expect(result.decisionLogged).toBe(false)
      expect(result.decisionLogNotice).toBe(GROUNDED_QUERY_DECISION_LOG_NOTICE)
    })

    it('un candidato que el append no puede probar tampoco tumba el draft, pero se declara', async () => {
      state.candidateVisible = false

      const result = await createGroundedQueryDraft(baseInput)

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(result.decisionLogged).toBe(false)
      expect(state.ledgerInserts).toHaveLength(0)
    })

    it('el fallback baseline registra su modo real, no el que se pretendía', async () => {
      state.authorResult = {
        draft: draftRow({ generationStrategy: 'template_baseline', systemPromptVersion: null }),
        authoringStatus: 'disabled'
      }

      const result = await createGroundedQueryDraft(baseInput)

      expect(result.ok).toBe(true)

      if (!result.ok) return

      expect(metadataOf()).toMatchObject({ groundingMode: 'baseline_fallback' })
    })
  })

  it('🔴 boundary §1.1: el bridge JAMÁS toca tablas grader_* ni cruza los dos motores', async () => {
    await createGroundedQueryDraft(baseInput)

    for (const sql of state.sqlCalls) {
      // El lado AEO se opera SOLO por sus commands (`authorGraderPromptSetDraft`,
      // `approveGraderPromptSet`): un SQL a `grader_*` desde acá sería el bridge tomándose
      // autoridad sobre el otro motor.
      expect(sql).not.toMatch(/grader_/i)

      // Y nunca un JOIN entre los dos motores: el cruce es en memoria por `organization_id`.
      expect(sql).not.toMatch(/seo_[a-z_]+[\s\S]*grader_|grader_[a-z_]+[\s\S]*seo_/i)
    }
  })

  it('🔴 el bridge no COMPONE candidatos con SQL propio: sólo `readKeywordDiscovery`', async () => {
    await createGroundedQueryDraft(baseInput)

    // TASK-1692 abrió una excepción ACOTADA a la regla "cero SQL de tablas": el bridge escribe
    // su decisión en el ledger de discovery, del lado SEO, vía el primitive canónico
    // `appendDiscoveryActionTx` (que trae consigo su chequeo de tenant sobre candidates).
    // Lo que sigue prohibido es que el bridge LEA candidatos por su cuenta para componerlos:
    // esa lectura es de `readKeywordDiscovery` y de nadie más.
    const allowed = [
      /pg_advisory_xact_lock/i,
      /INSERT INTO greenhouse_growth\.seo_keyword_discovery_actions/i,
      /FROM greenhouse_growth\.seo_keyword_discovery_actions/i,
      // Chequeo de tenant del append: SELECT de UNA columna por id, no una composición.
      /SELECT candidate_id\s+FROM greenhouse_growth\.seo_keyword_discovery_candidates/i
    ]

    for (const sql of state.sqlCalls) {
      expect(allowed.some(pattern => pattern.test(sql))).toBe(true)
    }

    // Y en particular: nada que lea las columnas de composición del candidato.
    for (const sql of state.sqlCalls) {
      expect(sql).not.toMatch(/normalized_keyword|seed_keywords_json|source_endpoint/i)
    }
  })
})
