import { notFound, redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { can } from '@/lib/entitlements/runtime'
import { isSeoKeywordDiscoveryEnabled, isSeoModuleEnabled } from '@/lib/growth/seo/flags'
import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'
import { readKeywordDiscovery } from '@/lib/growth/seo/keyword-discovery/reader'
import type { SeoDiscoveryCandidateView, SeoDiscoveryRunView } from '@/lib/growth/seo/keyword-discovery/reader'
import { resolveUnambiguousSeoTarget } from '@/lib/growth/seo/resolve-target'
import { readKeywordOpportunities } from '@/lib/growth/seo/keyword-opportunities-reader'
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
    discoveryRun?: string
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
    let discoveryRun: SeoDiscoveryRunView | null = null
    let discoveryCandidates: SeoDiscoveryCandidateView[] = []
    let discoveryTotal = 0

    if (selectedSpace && market) {
      const requestedRunId = (params.discoveryRun ?? '').trim() || undefined

      const runs = await readKeywordDiscovery({
        organizationId: selectedSpace.organizationId,
        seoTargetId: market.seoTargetId,
        runId: requestedRunId
      })

      if (runs.ok) {
        discoveryRun = runs.run ?? runs.runs[0] ?? null

        // Si el reader ya trajo candidatos (venía `runId`), no se vuelve a preguntar.
        if (runs.candidates.length > 0 || requestedRunId) {
          discoveryCandidates = runs.candidates
          discoveryTotal = runs.totalCandidates
        } else if (discoveryRun) {
          const withCandidates = await readKeywordDiscovery({
            organizationId: selectedSpace.organizationId,
            seoTargetId: market.seoTargetId,
            runId: discoveryRun.runId
          })

          if (withCandidates.ok) {
            discoveryCandidates = withCandidates.candidates
            discoveryTotal = withCandidates.totalCandidates
          }
        }
      }
    }

    return (
      <KeywordDiscoveryWorkbench
        organizationId={selectedSpace?.organizationId ?? null}
        seoTargetId={market?.seoTargetId ?? null}
        selectedSpaceId={selectedSpace?.organizationId ?? null}
        marketLabel={market ? `${market.market ?? market.locationCode} · ${market.languageCode}` : null}
        canExecute={discoveryEnabled && canTrackKeywords && Boolean(market)}
        disabledReason={discoveryDisabledReason}
        budgetRemainingUsd={null}
        run={discoveryRun}
        candidates={discoveryCandidates}
        totalCandidates={discoveryTotal}
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
  const [opportunities, tracked] = await Promise.all([
    readKeywordOpportunities(target.seo_target_id, { windowDays }),
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
