/**
 * TASK-1666 — Sanity live del puente grounded contra PG real (gate TASK-893).
 *
 * Verifica lo que los mocks no pueden probar:
 *   1. el bridge crea un DRAFT real en `grader_prompt_sets` (versión nueva, status draft,
 *      grounding sources con refs `seo.discovery.*`) desde candidatos REALES de discovery;
 *   2. el `active` previo del profile queda INTACTO y no aparece ningún grader run nuevo;
 *   3. idempotencia real: repetir la misma selección devuelve el MISMO draft sin re-autorar;
 *   4. anti-oracle y límites contra datos reales;
 *   5. (--author) smoke de autoría LLM REAL: una llamada al provider canónico produce un
 *      draft `grounded_llm` con 8–18 prompts, tags válidos y no-leading — las preguntas se
 *      imprimen para la eval humana de naturalidad.
 *
 * ⚠️ Este sanity ESCRIBE drafts reales (append-only, inofensivos: sólo `approve` los vuelve
 * operativos y este script jamás aprueba). Quedan como versiones etiquetadas `sanity-1666`.
 *
 * Uso (proxy en 127.0.0.1:15432 — `pnpm pg:connect` lo levanta):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1666-grounded-query-bridge.ts
 *   ... --author   # además, la autoría LLM real (centavos; requiere provider configurado)
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

// Flags ON sólo para ESTE proceso. La autoría se decide por --author.
process.env.GROWTH_SEO_ENABLED = 'true'
process.env.GROWTH_AI_VISIBILITY_GRADER_ENABLED = 'true'

const AUTHOR = process.argv.includes('--author')

process.env.GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED = AUTHOR ? 'true' : 'false'

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const { createGroundedQueryDraft } = await import('@/lib/growth/seo/grounded-query-bridge')
  const { readGroundedQueryDraft } = await import('@/lib/growth/seo/grounded-query-reader')

  const checks: Array<[string, boolean]> = []

  const record = (label: string, passed: boolean) => {
    checks.push([label, passed])
    console.log(`${passed ? '✅' : '❌'} ${label}`)
    if (!passed) process.exitCode = 1
  }

  // Subject operador real (el grant vive en runtime.ts; can() es evaluación pura).
  const subject = {
    userId: 'sanity-1666',
    tenantType: 'efeonce_internal',
    roleCodes: ['efeonce_admin'],
    primaryRoleCode: 'efeonce_admin',
    routeGroups: ['internal'],
    authorizedViews: []
  } as never

  // ── Datos reales: run de discovery + profile AEO de la misma org ──────────

  const run = (
    await runGreenhousePostgresQuery<{ run_id: string; organization_id: string; seo_target_id: string }>(
      `SELECT run_id, organization_id, seo_target_id
         FROM greenhouse_growth.seo_keyword_discovery_runs
        WHERE status = 'succeeded'
        ORDER BY requested_at DESC
        LIMIT 1`
    )
  )[0]

  if (!run) {
    console.error('No hay corridas de discovery succeeded (correr primero el smoke de TASK-1664).')
    process.exit(1)
  }

  const profile = (
    await runGreenhousePostgresQuery<{ profile_id: string }>(
      `SELECT profile_id
         FROM greenhouse_growth.grader_profiles
        WHERE organization_id = $1
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1`,
      [run.organization_id]
    )
  )[0]

  if (!profile) {
    console.error(`La org ${run.organization_id} no tiene grader profile (se necesita para el puente).`)
    process.exit(1)
  }

  const candidates = await runGreenhousePostgresQuery<{ candidate_id: string }>(
    `SELECT candidate_id
       FROM greenhouse_growth.seo_keyword_discovery_candidates
      WHERE run_id = $1
      ORDER BY candidate_id
      LIMIT 2`,
    [run.run_id]
  )

  if (candidates.length < 2) {
    console.error('La corrida no tiene 2+ candidatos.')
    process.exit(1)
  }

  const candidateIds = candidates.map(row => row.candidate_id)

  const countRows = async (sql: string, params: unknown[] = []) =>
    Number((await runGreenhousePostgresQuery<{ n: string }>(sql, params))[0]?.n ?? 0)

  const activeBefore = await countRows(
    `SELECT COUNT(*)::text AS n FROM greenhouse_growth.grader_prompt_sets WHERE profile_id = $1 AND status = 'active'`,
    [profile.profile_id]
  )

  const activeSetIdBefore = (
    await runGreenhousePostgresQuery<{ set_id: string }>(
      `SELECT set_id FROM greenhouse_growth.grader_prompt_sets WHERE profile_id = $1 AND status = 'active' LIMIT 1`,
      [profile.profile_id]
    )
  )[0]?.set_id

  const runsBefore = await countRows(`SELECT COUNT(*)::text AS n FROM greenhouse_growth.grader_runs`)

  // ── Anti-oracle y límites contra datos reales ─────────────────────────────

  const foreign = await createGroundedQueryDraft({
    subject,
    organizationId: 'org-ajena-sanity',
    profileId: profile.profile_id,
    seoTargetId: run.seo_target_id,
    discoveryRunId: run.run_id,
    candidateIds,
    createdBy: 'sanity-1666'
  })

  record('profile de otra org → profile_not_found (anti-oracle)', !foreign.ok && foreign.errorCode === 'profile_not_found')

  const tooMany = await createGroundedQueryDraft({
    subject,
    organizationId: run.organization_id,
    profileId: profile.profile_id,
    seoTargetId: run.seo_target_id,
    discoveryRunId: run.run_id,
    candidateIds: Array.from({ length: 21 }, (_, index) => `seokdc-fake-${index}`),
    createdBy: 'sanity-1666'
  })

  record('>20 candidates → candidate_limit_exceeded', !tooMany.ok && tooMany.errorCode === 'candidate_limit_exceeded')

  const alien = await createGroundedQueryDraft({
    subject,
    organizationId: run.organization_id,
    profileId: profile.profile_id,
    seoTargetId: run.seo_target_id,
    discoveryRunId: run.run_id,
    candidateIds: [candidateIds[0], 'seokdc-inexistente'],
    createdBy: 'sanity-1666'
  })

  record('candidate inexistente → candidate_not_found', !alien.ok && alien.errorCode === 'candidate_not_found')

  // ── Draft real (baseline u autoría según --author) ────────────────────────

  const created = await createGroundedQueryDraft({
    subject,
    organizationId: run.organization_id,
    profileId: profile.profile_id,
    seoTargetId: run.seo_target_id,
    discoveryRunId: run.run_id,
    candidateIds,
    createdBy: 'sanity-1666'
  })

  if (!created.ok) {
    record(`creación del draft falló (${created.errorCode})`, false)
    process.exit(1)
  }

  record(
    `draft creado: ${created.draft.setId} v${created.draft.version} [${created.draft.status}] modo=${created.groundingMode}`,
    created.draft.status === 'draft'
  )

  record(
    AUTHOR ? 'modo grounded_llm (autoría real)' : 'modo baseline_fallback (sin autoría) + aviso obligatorio',
    AUTHOR ? created.groundingMode === 'grounded_llm' : created.groundingMode === 'baseline_fallback' && created.fallbackNotice !== null
  )

  // Refs opacas en el draft persistido.
  const persisted = (
    await runGreenhousePostgresQuery<{ status: string; grounding_sources_json: unknown; version: number }>(
      `SELECT status, grounding_sources_json, version
         FROM greenhouse_growth.grader_prompt_sets
        WHERE set_id = $1`,
      [created.draft.setId]
    )
  )[0]

  const sources = Array.isArray(persisted?.grounding_sources_json) ? (persisted.grounding_sources_json as string[]) : []

  record('el draft persistido es status=draft', persisted?.status === 'draft')
  record(
    'grounding_sources_json contiene run + candidates + context hash (refs opacas)',
    sources.includes(`seo.discovery.run:${run.run_id}`) &&
      candidateIds.every(id => sources.includes(`seo.discovery.candidate:${id}`)) &&
      sources.some(source => /^seo\.discovery\.context:[0-9a-f]{64}$/.test(source))
  )
  record(
    'ninguna ref contiene keyword cruda',
    sources.every(source => !/pintura|epóxico|piso/i.test(source))
  )

  // ── Lo que NO debe pasar ──────────────────────────────────────────────────

  const activeAfter = await countRows(
    `SELECT COUNT(*)::text AS n FROM greenhouse_growth.grader_prompt_sets WHERE profile_id = $1 AND status = 'active'`,
    [profile.profile_id]
  )

  const activeSetIdAfter = (
    await runGreenhousePostgresQuery<{ set_id: string }>(
      `SELECT set_id FROM greenhouse_growth.grader_prompt_sets WHERE profile_id = $1 AND status = 'active' LIMIT 1`,
      [profile.profile_id]
    )
  )[0]?.set_id

  record('el active previo queda INTACTO (mismo count y mismo set)', activeAfter === activeBefore && activeSetIdAfter === activeSetIdBefore)

  const runsAfter = await countRows(`SELECT COUNT(*)::text AS n FROM greenhouse_growth.grader_runs`)

  record('cero grader runs nuevos (el draft no ejecuta nada)', runsAfter === runsBefore)

  // ── Idempotencia real ─────────────────────────────────────────────────────

  const repeat = await createGroundedQueryDraft({
    subject,
    organizationId: run.organization_id,
    profileId: profile.profile_id,
    seoTargetId: run.seo_target_id,
    discoveryRunId: run.run_id,
    candidateIds,
    createdBy: 'sanity-1666'
  })

  record(
    'repetir la MISMA selección devuelve el MISMO draft (deduped, sin re-autorar)',
    repeat.ok && repeat.deduped && repeat.draft.setId === created.draft.setId
  )

  // ── Reader ────────────────────────────────────────────────────────────────

  const read = await readGroundedQueryDraft({
    subject,
    organizationId: run.organization_id,
    profileId: profile.profile_id,
    setId: created.draft.setId
  })

  record(
    'el reader sirve el draft con provenance y modo derivado de los hechos',
    read.ok && read.setId === created.draft.setId && read.groundingMode === created.groundingMode && read.sourceRefs.length >= 3
  )

  const readForeign = await readGroundedQueryDraft({
    subject,
    organizationId: 'org-ajena-sanity',
    profileId: profile.profile_id,
    setId: created.draft.setId
  })

  record('reader con org ajena → profile_not_found (anti-oracle)', !readForeign.ok && readForeign.errorCode === 'profile_not_found')

  // ── Eval humana (sólo --author): naturalidad y no-leading de las preguntas ─

  if (AUTHOR && read.ok) {
    const total = read.prompts.length
    const discovery = read.prompts.filter(prompt => !prompt.namesBrand)
    const discoveryWithBrand = discovery.filter(prompt => prompt.text.includes('{{brand}}'))

    // La regla de la spec: la keyword es TEMA, no se copia 1:1 como "pregunta". Se compara
    // contra las keywords reales de los candidatos seleccionados.
    const keywordRows = await runGreenhousePostgresQuery<{ normalized_keyword: string }>(
      `SELECT normalized_keyword FROM greenhouse_growth.seo_keyword_discovery_candidates
        WHERE candidate_id = ANY($1::text[])`,
      [candidateIds]
    )

    const keywords = keywordRows.map(row => row.normalized_keyword)

    const literalCopies = read.prompts.filter(prompt => {
      const normalized = prompt.text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()

      return keywords.includes(normalized)
    })

    record(`la autoría produjo ${total} prompts (contrato 8–18)`, total >= 8 && total <= 18)
    record('cero prompts de descubrimiento con {{brand}} (no-leading)', discoveryWithBrand.length === 0)
    record('ninguna keyword copiada 1:1 como pregunta (la seed es tema, no texto)', literalCopies.length === 0)

    console.log('\n— PREGUNTAS PARA EVAL HUMANA (revisar naturalidad antes de aprobar) —')

    for (const prompt of read.prompts) {
      console.log(`  [${prompt.family}/${prompt.fanOutType}/${prompt.intentStage}${prompt.namesBrand ? '/marca' : ''}] ${prompt.text}`)
    }
  }

  const passed = checks.filter(([, ok]) => ok).length

  console.log(`\n${passed}/${checks.length} checks OK${AUTHOR ? ' (incluye autoría LLM real)' : ''}`)
  process.exit(process.exitCode ?? 0)
}

main().catch(error => {
  console.error('Sanity TASK-1666 reventó:', error)
  process.exit(1)
})
