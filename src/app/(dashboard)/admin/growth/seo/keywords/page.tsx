import { notFound, redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { can } from '@/lib/entitlements/runtime'
import { isGraderEnabled } from '@/lib/growth/ai-visibility/flags'
import { getGraderProfileForOrganization } from '@/lib/growth/ai-visibility/store'
import { enforceSeoRunEntitlement } from '@/lib/growth/seo/entitlement'
import { isSeoKeywordDiscoveryEnabled, isSeoModuleEnabled, isSeoWorkQueueEnabled } from '@/lib/growth/seo/flags'
import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import { parseKeywordDiscoveryQuery } from '@/views/greenhouse/admin/growth/seo/keywords/discovery/keyword-discovery-query'
import { readSeedSourceAvailability } from '@/lib/growth/seo/keyword-discovery/queue'
import type { SeoDiscoverySeedSourceAvailability } from '@/lib/growth/seo/keyword-discovery/queue'
import { DEFAULT_DISCOVERY_READ_LIMIT, readKeywordDiscovery } from '@/lib/growth/seo/keyword-discovery/reader'
import type { SeoDiscoveryCandidateView, SeoDiscoveryRunView } from '@/lib/growth/seo/keyword-discovery/reader'
import { resolveUnambiguousSeoTarget } from '@/lib/growth/seo/resolve-target'
import { readKeywordOpportunities } from '@/lib/growth/seo/keyword-opportunities-reader'
import { readKeywordOpportunitiesFromWorkQueue } from '@/lib/growth/seo/work-queue/opportunities-adapter'
import { listSeoEligibleSpaces } from '@/lib/growth/seo/overview/list-seo-spaces'
import { readSeoOverviewConnection } from '@/lib/growth/seo/overview/read-overview-connection'
import { resolveTrackedKeywordCapacity } from '@/lib/growth/seo/track-keywords'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import KeywordOpportunitiesView from '@/views/greenhouse/admin/growth/seo/keywords/KeywordOpportunitiesView'
import KeywordDiscoveryWorkbench from '@/views/greenhouse/admin/growth/seo/keywords/discovery/KeywordDiscoveryWorkbench'

/**
 * TASK-1308 — Oportunidades de keywords (`EPIC-022` §10.4, nodo S3 del master flow).
 *
 * Guard idéntico al del cockpit (TASK-1306) y Rendimiento (TASK-1307) porque es la MISMA
 * surface: viewCode `administracion.growth_seo` + capability `growth.seo.observation.read`
 * + `module_assignment` per-org resuelto por los Spaces elegibles, con `notFound()` si el
 * módulo está apagado y redirect defensivo si el tenant es `client`. Child del mismo
 * viewCode: NO siembra uno nuevo ni suma ítem de menú.
 *
 * ⚠️ VER Y SEGUIR SON DOS PERMISOS. `observation.read` abre la pantalla;
 * `growth.seo.target.configure` habilita "Seguir", que compromete gasto recurrente del
 * proveedor. Un analista puede leer el mapa completo sin poder hacer crecer la factura, y
 * la UI oculta el botón en vez de dejarlo fallar en el submit.
 */

export const metadata: Metadata = { title: 'Keywords — SEO | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const VIEW_CODE = 'administracion.growth_seo'

/** Ventanas que ofrece el selector. Un valor fuera de la lista cae al default. */
const ALLOWED_WINDOW_DAYS = new Set([28, 90])
const DEFAULT_WINDOW_DAYS = 28

/**
 * Los filtros locales también entran por la URL.
 *
 * No los lee el reader —el filtrado es en cliente sobre filas ya cargadas— pero sí tienen
 * que sobrevivir a un enlace pegado: esta pantalla se comparte ("mira estas 42 de
 * consolidación"). El cliente los sincroniza de vuelta con `history.replaceState`, sin
 * round-trip por tecla.
 */
interface PageProps {
  searchParams: Promise<{
    space?: string
    window?: string
    q?: string
    action?: string
    position?: string
    view?: string
    // ── Estado de la lente `Descubrir` en la URL (TASK-1693) ────────────────────────────
    // Allowlist explícita, igual que el resto: lo que no está acá no existe para la lente.
    discoveryRun?: string
    source?: string
    intent?: string
    state?: string
    status?: string
    minVolume?: string
    maxLinkBarrier?: string
    includeUnknownBarrier?: string
  }>
}

/**
 * TASK-1665 — Lentes de la superficie. `Oportunidades` es la vista por defecto, así que
 * `/keywords` sin `?view=` sigue significando exactamente lo que significaba.
 */
const ALLOWED_LENSES = new Set(['opportunities', 'discovery'])

const ALLOWED_ACTIONS = new Set(['quickWin', 'striking', 'cannibalized'])
const ALLOWED_POSITIONS = new Set(['firstPage', 'secondPage'])

export default async function Page({ searchParams }: PageProps) {
  // Puerta 0 — flag del módulo (default OFF). Con el módulo apagado la ruta NO existe.
  if (!isSeoModuleEnabled()) {
    notFound()
  }

  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  // Defensivo: un tenant cliente NUNCA entra a una surface interna, aunque por drift de
  // grants tuviera el viewCode. Su acceso al módulo va por `growth.seo.report.read_client`.
  if (tenant.tenantType === 'client') {
    redirect('/401')
  }

  const hasAccess =
    hasAuthorizedViewCode({
      tenant,
      viewCode: VIEW_CODE,
      fallback: tenant.routeGroups.includes('admin')
    }) && can(tenant, 'growth.seo.observation.read', 'read', 'tenant')

  if (!hasAccess) {
    redirect('/401')
  }

  const params = await searchParams
  const spaces = await listSeoEligibleSpaces()

  // El `?space=` es COMPARTIBLE pero no autoridad: uno sin `module_assignment` vigente cae
  // al primer Space elegible. Confiar en él dejaría que un enlace pegado saltee el gate.
  const selectedSpace = spaces.find(candidate => candidate.organizationId === params.space) ?? spaces[0] ?? null

  const parsedWindow = Number.parseInt(params.window ?? '', 10)
  const windowDays = ALLOWED_WINDOW_DAYS.has(parsedWindow) ? parsedWindow : DEFAULT_WINDOW_DAYS

  // Un valor fuera de la allowlist cae al default, igual que `?window=`: un enlace pegado
  // no puede meter un filtro que la UI no sabe representar.
  const initialSearch = (params.q ?? '').slice(0, 120)
  const initialAction = ALLOWED_ACTIONS.has(params.action ?? '') ? (params.action as 'quickWin' | 'striking' | 'cannibalized') : 'all'

  const initialPosition = ALLOWED_POSITIONS.has(params.position ?? '')
    ? (params.position as 'firstPage' | 'secondPage')
    : 'all'

  const canTrackKeywords = can(tenant, 'growth.seo.target.configure', 'execute', 'tenant')
  const capacity = resolveTrackedKeywordCapacity()

  // ── TASK-1665 — lente `Descubrir` ──────────────────────────────────────────────────────
  //
  // Se resuelve ANTES de la conexión de Search Console a propósito: descubrir no depende de la
  // demanda medida (una seed escrita a mano basta), así que exigir GSC bloquearía justo el caso
  // de un Space nuevo, que es cuando más falta hace investigar.
  const activeLens = ALLOWED_LENSES.has(params.view ?? '') ? (params.view as 'opportunities' | 'discovery') : 'opportunities'

  if (activeLens === 'discovery') {
    const discoveryEnabled = isSeoKeywordDiscoveryEnabled()
    const discoveryTarget = selectedSpace ? await resolveUnambiguousSeoTarget(selectedSpace.organizationId) : null
    const market = discoveryTarget?.target ?? null

    // El CTA no se renderiza si falta flag, capability o sitio; el motivo se dice en la banda de
    // costo. Un botón apagado invita a buscar cómo encenderlo — la explicación es más útil.
    const discoveryDisabledReason = !discoveryEnabled
      ? GH_GROWTH_SEO_KEYWORDS.discovery.disabledReason.flag
      : !canTrackKeywords
        ? GH_GROWTH_SEO_KEYWORDS.discovery.disabledReason.permission
        : !market
          ? GH_GROWTH_SEO_KEYWORDS.discovery.disabledReason.noTarget
          : null

    // Lectura en DOS pasos a propósito: sin `runId` el reader devuelve sólo el historial de
    // corridas (no candidatos), así que primero se resuelve CUÁL corrida mirar —la del enlace
    // compartido o la última— y recién entonces se piden sus candidatos. Pedir todo de una haría
    // que un deep-link a una corrida vieja trajera la nueva.
    const discoveryQuery = parseKeywordDiscoveryQuery(params as Record<string, string | string[] | undefined>)

    /*
     * 🔴 `maxDifficulty` NO se traduce, ni siquiera si llega por URL: el reader lo declara no-op
     * y lo reporta en `ignoredFilters`. El filtro canónico es `maxLinkBarrier`.
     */
    const discoveryFilterInput = {
      query: discoveryQuery.q || undefined,
      sourceEndpoint: discoveryQuery.source === 'all' ? undefined : discoveryQuery.source,
      intent: discoveryQuery.intent === 'all' ? undefined : discoveryQuery.intent,
      minSearchVolume: discoveryQuery.minVolume ?? undefined,
      maxLinkBarrier: discoveryQuery.maxLinkBarrier === 'all' ? undefined : discoveryQuery.maxLinkBarrier,
      includeUnknownBarrier: discoveryQuery.includeUnknownBarrier || undefined,
      excludeTracked: discoveryQuery.state === 'untracked' || undefined
    }

    let discoveryRun: SeoDiscoveryRunView | null = null
    let discoveryCandidates: SeoDiscoveryCandidateView[] = []
    let discoveryTotal = 0
    let discoveryNextCursor: string | null = null

    if (selectedSpace && market) {
      const requestedRunId = (params.discoveryRun ?? '').trim() || undefined

      /*
       * TASK-1693 Slice 3 — los filtros del canvas viajan por URL y se aplican SERVER-SIDE.
       *
       * Filtrar en cliente sobre un cursor paginado mentiría sobre el universo filtrado: diría
       * «3 candidatos» mirando 50 filas cuando hay 40 repartidos en páginas que nadie trajo. El
       * allowlist de `parseKeywordDiscoveryQuery` decide qué existe para esta lente; un valor
       * inválido cae al default y jamás rompe la página.
       */

      /*
       * TASK-1693 — el `limit` se pasa EXPLÍCITO, no se hereda del default del reader.
       *
       * El cliente pide las páginas siguientes con ese mismo tamaño para que el conteo que
       * anuncia el botón («Ver 50 candidatos más») coincida con lo que efectivamente llega. Si el
       * server usara el default implícito y el cliente otro número, el botón prometería una cifra
       * y entregaría otra — sobre un canvas donde el operador está contando lo que revisó.
       */
      const runs = await readKeywordDiscovery({
        organizationId: selectedSpace.organizationId,
        seoTargetId: market.seoTargetId,
        runId: requestedRunId,
        limit: DEFAULT_DISCOVERY_READ_LIMIT,
        ...discoveryFilterInput
      })

      if (runs.ok) {
        discoveryRun = runs.run ?? runs.runs[0] ?? null

        // Si el reader ya trajo candidatos (venía `runId`), no se vuelve a preguntar.
        if (runs.candidates.length > 0 || requestedRunId) {
          discoveryCandidates = runs.candidates
          discoveryTotal = runs.totalCandidates
          discoveryNextCursor = runs.nextCursor
        } else if (discoveryRun) {
          const withCandidates = await readKeywordDiscovery({
            organizationId: selectedSpace.organizationId,
            seoTargetId: market.seoTargetId,
            runId: discoveryRun.runId,
            limit: DEFAULT_DISCOVERY_READ_LIMIT,
            ...discoveryFilterInput
          })

          if (withCandidates.ok) {
            discoveryCandidates = withCandidates.candidates
            discoveryTotal = withCandidates.totalCandidates
            discoveryNextCursor = withCandidates.nextCursor
          }
        }
      }
    }

    /*
     * ── Cupo del período, resuelto server-side ───────────────────────────────────────────
     *
     * La banda de costo promete responder «¿me cabe?» y hasta acá siempre decía «Cupo no
     * disponible»: el dato existía en el gate y nadie lo pedía, así que el operador descubría el
     * bloqueo recién con el rebote del enqueue.
     *
     * Se consulta el MISMO chokepoint canónico que usan el preview y el enqueue
     * (`enforceSeoRunEntitlement`) — no una lectura paralela del presupuesto. Sin
     * `estimatedCostUsd` la llamada es una pregunta pura por el remanente: no reserva, no gasta y
     * no consume allowance de audits (`consumesAuditAllowance: false`, igual que el rank capture,
     * porque descubrir tampoco crea `seo_site_audit_runs`).
     *
     * ⚠️ Sigue siendo informativa, no autorizante: el command recalcula antes de persistir y
     * puede bloquear con un cupo distinto si algo gastó en el intertanto.
     */
    let discoveryBudgetRemainingUsd: number | null = null

    /*
     * TASK-1693 — disponibilidad de fuentes de seed, resuelta SERVER-SIDE.
     *
     * Se pregunta a los mismos resolvers que usará el encolado (`readSeedSourceAvailability`),
     * así que «disponible» significa exactamente «el command encontraría seeds». Descubrirlo con
     * el rebote llegaría DESPUÉS de que el operador confirmó, y para entonces ya eligió una
     * fuente que no podía servirle.
     *
     * Sólo se pregunta si además hay permiso de encolar: sin él el selector no se renderiza y las
     * dos lecturas serían gasto de render puro.
     */
    let seedSourceAvailability: SeoDiscoverySeedSourceAvailability | null = null

    if (selectedSpace && market && discoveryEnabled && canTrackKeywords) {
      seedSourceAvailability = await readSeedSourceAvailability(selectedSpace.organizationId, market.seoTargetId)
    }

    if (selectedSpace && market && discoveryEnabled && canTrackKeywords) {
      const gate = await enforceSeoRunEntitlement(selectedSpace.organizationId, { consumesAuditAllowance: false })

      discoveryBudgetRemainingUsd = gate.budgetRemainingUsd ?? null
    }

    // ── TASK-1665 Slice 4 — puente grounded (TASK-1666) ──────────────────────────────────
    //
    // ⚠️ Son DOS planos de capability, no uno: leer candidatos SEO y gestionar prompts AEO. Y
    // además hace falta un perfil AEO enlazado al Space, porque `createGroundedQueryDraft` lo
    // exige. Resolverlo acá —y no en el cliente— evita ofrecer una acción que el command va a
    // rechazar después: el motivo se dice antes, no se descubre al confirmar.
    const canManageAeoPrompts = can(tenant, 'growth.ai_visibility.prompt_set.manage', 'execute', 'tenant')

    const graderProfile =
      selectedSpace && isGraderEnabled() && canManageAeoPrompts
        ? await getGraderProfileForOrganization(selectedSpace.organizationId)
        : null

    const groundedDisabledReason = !isGraderEnabled()
      ? GH_GROWTH_SEO_KEYWORDS.discovery.actions.disabledGroundedFlag
      : !canManageAeoPrompts
        ? GH_GROWTH_SEO_KEYWORDS.discovery.actions.disabledGroundedNoPermission
        : !graderProfile
          ? GH_GROWTH_SEO_KEYWORDS.discovery.actions.disabledGroundedNoProfile
          : null

    return (
      <KeywordDiscoveryWorkbench
        organizationId={selectedSpace?.organizationId ?? null}
        seoTargetId={market?.seoTargetId ?? null}
        selectedSpaceId={selectedSpace?.organizationId ?? null}
        marketLabel={market ? `${market.market ?? market.locationCode} · ${market.languageCode}` : null}
        canExecute={discoveryEnabled && canTrackKeywords && Boolean(market)}
        disabledReason={discoveryDisabledReason}
        budgetRemainingUsd={discoveryBudgetRemainingUsd}
        graderProfileId={graderProfile?.profileId ?? null}
        groundedDisabledReason={groundedDisabledReason}
        run={discoveryRun}
        candidates={discoveryCandidates}
        totalCandidates={discoveryTotal}
        nextCursor={discoveryNextCursor}
        pageSize={DEFAULT_DISCOVERY_READ_LIMIT}
        seedSourceAvailability={seedSourceAvailability}
        discoveryQuery={discoveryQuery}
      />
    )
  }

  if (!selectedSpace) {
    // Pasar el gate y no tener NINGÚN Space con el módulo no es un error: es el estado
    // honesto "sin Spaces con SEO", y la view lo dice con esas palabras.
    return (
      <KeywordOpportunitiesView
        initialSearch={initialSearch}
        initialAction={initialAction}
        initialPosition={initialPosition}
        spaces={spaces}
        selectedSpaceId={null}
        rootDomain={null}
        connectionState='not_connected'
        dataAsOf={null}
        canConnectSearchConsole={false}
        canTrackKeywords={false}
        windowDays={windowDays}
        opportunities={null}
        trackedKeywords={[]}
        capacity={capacity}
      />
    )
  }

  const connection = await readSeoOverviewConnection(selectedSpace.organizationId)

  // Sin conexión no hay demanda medida, y estas oportunidades se calculan con ella: pedir
  // la lectura igual gastaría queries para devolver un vacío que la view ya sabe pintar.
  if (connection.state === 'not_connected' || connection.state === 'no_snapshots') {
    return (
      <KeywordOpportunitiesView
        initialSearch={initialSearch}
        initialAction={initialAction}
        initialPosition={initialPosition}
        spaces={spaces}
        selectedSpaceId={selectedSpace.organizationId}
        rootDomain={null}
        connectionState={connection.state}
        dataAsOf={connection.dataAsOf}
        canConnectSearchConsole={can(tenant, 'growth.search_console.connect', 'execute', 'tenant')}
        canTrackKeywords={canTrackKeywords}
        windowDays={windowDays}
        opportunities={null}
        trackedKeywords={[]}
        capacity={capacity}
      />
    )
  }

  // ISSUE-153: resolución canónica del target — jamás `LIMIT 1` inline. Con varios mercados
  // activos y sin selector de mercado en esta superficie (follow-up de producto), la página
  // degrada al mismo estado honesto de "sin target" en vez de servir un país al azar.
  const resolved = await resolveUnambiguousSeoTarget(selectedSpace.organizationId)

  const target = resolved.target
    ? { seo_target_id: resolved.target.seoTargetId, root_domain: resolved.target.rootDomain }
    : undefined

  if (!target) {
    return (
      <KeywordOpportunitiesView
        initialSearch={initialSearch}
        initialAction={initialAction}
        initialPosition={initialPosition}
        spaces={spaces}
        selectedSpaceId={selectedSpace.organizationId}
        rootDomain={null}
        connectionState='no_snapshots'
        dataAsOf={connection.dataAsOf}
        canConnectSearchConsole={false}
        canTrackKeywords={canTrackKeywords}
        windowDays={windowDays}
        opportunities={null}
        trackedKeywords={[]}
        capacity={capacity}
      />
    )
  }

  // Oportunidades y set vigente en paralelo: son independientes y secuenciarlos duplicaría
  // la latencia del primer paint. El set vigente es lo que decide si una fila dice "Seguir"
  // o "Siguiendo" — sin él la pantalla ofrecería seguir algo que ya se sigue.
  /*
   * ── TASK-1700 Slice 7 — el cutover de la fuente de ORDEN ────────────────────────────────
   *
   * 🔴 La lente cambia de FUENTE, no de FORMA: mismas columnas, mismo copy, misma
   * interacción. Lo único que cambia es quién manda el orden — pasa de un score no versionado
   * calculado al vuelo a un snapshot inmutable con su `priority_score_version` persistida, que
   * es lo que hace auditable "la recomendación #1 de la mañana" a las 3 de la tarde.
   *
   * La rama de fallback NO es código muerto duplicado: con el flag apagado, con la cola caída
   * o mientras el primer snapshot todavía no existe, la lente sigue sirviendo el reader
   * legacy. Servir una lente vacía sería peor que no cambiar nada — "no hay oportunidades" y
   * "la cola aún no corrió" son afirmaciones distintas.
   */
  const workQueueLens = isSeoWorkQueueEnabled()
    ? await readKeywordOpportunitiesFromWorkQueue(target.seo_target_id, { windowDays })
    : null

  const [opportunities, tracked] = await Promise.all([
    workQueueLens?.result ?? readKeywordOpportunities(target.seo_target_id, { windowDays }),
    runGreenhousePostgresQuery<{ keyword: string }>(
      `SELECT DISTINCT m.keyword
         FROM greenhouse_growth.seo_keyword_set_members m
         JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
        WHERE s.seo_target_id = $1
          AND m.effective_to IS NULL`,
      [target.seo_target_id]
    )
  ])

  return (
    <KeywordOpportunitiesView
      initialSearch={initialSearch}
      initialAction={initialAction}
      initialPosition={initialPosition}
      spaces={spaces}
      selectedSpaceId={selectedSpace.organizationId}
      seoTargetId={target.seo_target_id}
      rootDomain={target.root_domain}
      connectionState={connection.state}
      dataAsOf={connection.dataAsOf}
      canConnectSearchConsole={false}
      canTrackKeywords={canTrackKeywords}
      windowDays={windowDays}
      opportunities={opportunities}
      trackedKeywords={tracked.map(row => row.keyword)}
      capacity={capacity}
    />
  )
}
