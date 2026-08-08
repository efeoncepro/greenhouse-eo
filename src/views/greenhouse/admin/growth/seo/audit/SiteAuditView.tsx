'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@/components/greenhouse/EmptyState'
import {
  GreenhouseAsyncActionButton,
  GreenhouseButton,
  GreenhouseBreadcrumbs,
  GreenhouseChip
} from '@/components/greenhouse/primitives'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import SurfaceRecipe from '@/components/greenhouse/primitives/surface-system/SurfaceRecipe'
import WorkbenchHeader from '@/components/greenhouse/primitives/surface-system/WorkbenchHeader'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import { GH_GROWTH_SEO_AUDIT, GH_GROWTH_SEO_OVERVIEW } from '@/lib/copy/growth'
import type { SeoSiteAuditFindingSeverity, SiteAuditReportResult } from '@/lib/growth/seo/contracts'
import type { SeoSpaceOption } from '@/lib/growth/seo/overview/list-seo-spaces'

import SeoHealthGauge from '../shared/SeoHealthGauge'
import SeoSearchVisibilityTabs from '../overview/SeoSearchVisibilityTabs'
import { STALE_CRAWL_DAYS, daysSinceCrawl, groupAuditIssues } from './group-audit-issues'
import type { SeoAuditIssueGroup } from './group-audit-issues'

/**
 * TASK-1309 — Auditoría del sitio (nodo S4 de EPIC-022).
 *
 * Cliente PURO: no calcula salud, no decide acceso y no deriva el estado del crawl. Todo
 * eso llega resuelto del servidor; acá sólo se presenta. La única regla que vive de este
 * lado es la PRIORIZACIÓN de la lista, y por eso está extraída y testeada aparte
 * (`group-audit-issues.ts`), no enterrada en el JSX.
 *
 * La decisión de producto que gobierna la pantalla: los issues van como LISTA
 * priorizada, no como tabla plana. Una tabla ordenable invita a leer por columna; acá la
 * pregunta es "¿qué ataco primero?" y la respuesta tiene que estar en el orden, no en un
 * control que el operador deba descubrir. La tabla aparece UNA vez, dentro del drill,
 * donde sí hay una lista homogénea (las URLs de un grupo).
 */

/** Severidad = icono + label + color. Nunca color solo (8% de daltonismo). */
const SEVERITY_PRESENTATION: Record<
  SeoSiteAuditFindingSeverity,
  { icon: string; label: string; tone: 'error' | 'warning' | 'info' }
> = {
  critical: { icon: 'tabler-alert-octagon', label: GH_GROWTH_SEO_AUDIT.severity.critical, tone: 'error' },
  warning: { icon: 'tabler-alert-triangle', label: GH_GROWTH_SEO_AUDIT.severity.warning, tone: 'warning' },
  notice: { icon: 'tabler-info-circle', label: GH_GROWTH_SEO_AUDIT.severity.notice, tone: 'info' }
}

/** Techo de URLs por drill: una lista de miles no ayuda a decidir y castiga el render. */
const DRILL_URL_LIMIT = 200

/** Id estable del disparador de un grupo — el ancla del retorno de foco al cerrar el drill. */
const triggerId = (issueType: string) => `seo-audit-trigger-${issueType}`

interface Props {
  spaces: readonly SeoSpaceOption[]
  selectedSpaceId: string | null
  rootDomain: string | null
  seoTargetId: string | null
  report: SiteAuditReportResult | null
  openIssueGroup: string | null
  canRunAudit: boolean
}

const StatBlock = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Stack spacing={0.5} sx={{ minInlineSize: 0 }}>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='h4' sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
      {value}
    </Typography>
    {hint ? (
      <Typography variant='caption' color='text.secondary'>
        {hint}
      </Typography>
    ) : null}
  </Stack>
)

const SiteAuditView = ({
  spaces,
  selectedSpaceId,
  rootDomain,
  seoTargetId,
  report,
  openIssueGroup,
  canRunAudit
}: Props) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const selectedSpace = useMemo(
    () => spaces.find(space => space.organizationId === selectedSpaceId) ?? null,
    [spaces, selectedSpaceId]
  )

  const pushQuery = useCallback(
    (next: { space?: string; issueGroup?: string | null }) => {
      const params = new URLSearchParams()
      const space = next.space ?? selectedSpaceId

      if (space) {
        params.set('space', space)
      }

      // `issueGroup` ausente en `next` = conservar; `null` = cerrar el drill.
      const group = next.issueGroup === undefined ? openIssueGroup : next.issueGroup

      if (group) {
        params.set('issueGroup', group)
      }

      const query = params.toString()

      startTransition(() => router.push(query ? `/admin/growth/seo/audit?${query}` : '/admin/growth/seo/audit'))
    },
    [router, selectedSpaceId, openIssueGroup]
  )

  const groups = useMemo(
    () => (report?.ok ? groupAuditIssues(report.findings) : []),
    [report]
  )

  const openGroup = useMemo(
    () => groups.find(group => group.issueType === openIssueGroup) ?? null,
    [groups, openIssueGroup]
  )

  // Contrato de foco del wireframe: al abrir un grupo el foco va a su encabezado; al
  // cerrarlo vuelve a la fila que lo abrió. Sin esto, quien navega por teclado queda
  // arriba de todo tras cada drill y tiene que recorrer la lista completa de nuevo.
  //
  // El disparador se busca por `id` y no por ref: abrir el drill es una navegación
  // (`?issueGroup=`), y un ref capturado antes de ella puede apuntar a un nodo que React
  // ya reemplazó. El `id` es estable porque lo deriva el propio `issueType`.
  const drillHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const lastOpenedRef = useRef<string | null>(null)

  useEffect(() => {
    if (openGroup && lastOpenedRef.current !== openGroup.issueType) {
      lastOpenedRef.current = openGroup.issueType
      drillHeadingRef.current?.focus()

      return
    }

    if (!openGroup && lastOpenedRef.current) {
      document.getElementById(triggerId(lastOpenedRef.current))?.focus()
      lastOpenedRef.current = null
    }
  }, [openGroup])

  const run = report?.ok ? report.run : null
  const staleDays = daysSinceCrawl(run?.finishedAt ?? run?.startedAt ?? null)
  const isRunning = run?.status === 'running'

  // Feedback del enqueue. `actionable` viaja desde el contrato canónico: el guard de
  // idempotencia y el cupo agotado NO llevan reintento (reintentar es exactamente lo que
  // no corresponde), mientras que una caída del proveedor sí.
  const [runState, setRunState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [runMessage, setRunMessage] = useState<{ text: string; severity: 'success' | 'warning' | 'error' } | null>(null)

  const handleRunAudit = useCallback(async () => {
    if (!seoTargetId) {
      return
    }

    setRunState('loading')
    setRunMessage(null)

    try {
      const response = await fetch('/api/admin/growth/seo/audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seoTargetId })
      })

      await throwIfNotOk(response, GH_GROWTH_SEO_AUDIT.runErrors.generic)

      setRunState('success')
      setRunMessage({ text: GH_GROWTH_SEO_AUDIT.action.queued, severity: 'success' })

      // El servidor ya persistió el run en `running`: revalidar es lo que hace que la
      // pantalla lo muestre, sin inventar el estado en el cliente.
      startTransition(() => router.refresh())
    } catch (error) {
      setRunState('error')
      setRunMessage({
        text: error instanceof Error ? error.message : GH_GROWTH_SEO_AUDIT.runErrors.generic,
        // Que ya hubiera una auditoría del día no es una falla del operador: se informa,
        // no se le grita en rojo.
        severity: error instanceof Error && 'code' in error && String(error.code).startsWith('seo_audit_already')
          ? 'warning'
          : 'error'
      })
    }
  }, [seoTargetId, router])

  const runAuditButton =
    canRunAudit && seoTargetId ? (
      <GreenhouseAsyncActionButton
        kind='primaryAction'
        state={runState}
        // Con un crawl en vuelo el botón no tiene nada que hacer: el propio command lo
        // rebotaría con `audit_already_running`, así que se declara antes de gastar el clic.
        disabled={isRunning}
        loadingLabel={GH_GROWTH_SEO_AUDIT.action.running}
        onClick={handleRunAudit}
        dataCapture='seo-audit-run'
        startIcon={<i className='tabler-radar' />}
      >
        {GH_GROWTH_SEO_AUDIT.action.run}
      </GreenhouseAsyncActionButton>
    ) : null

  const header = (
    <Stack spacing={4}>
      {/* Sin hrefs, misma convención que Overview y Rendimiento: "Growth" es un grupo de
          menú y la navegación entre hermanas ES la barra de tabs de este mismo header. */}
      <GreenhouseBreadcrumbs
        items={[
          { label: GH_INTERNAL_NAV.growth.label },
          { label: GH_GROWTH_SEO_OVERVIEW.breadcrumbSection },
          { label: GH_GROWTH_SEO_AUDIT.header.breadcrumbLeaf }
        ]}
      />

      <WorkbenchHeader
        kind='report'
        titleComponent='h1'
        dataCapture='seo-audit-toolbar'
        title={GH_GROWTH_SEO_AUDIT.header.title}
        description={
          rootDomain
            ? GH_GROWTH_SEO_AUDIT.header.subtitle(rootDomain)
            : GH_GROWTH_SEO_AUDIT.header.subtitleNoDomain
        }
        meta={
          // El freshness es la señal de cuánto confiar en TODO lo de abajo, así que vive
          // en la cabecera y no dentro de una card. Sin crawl se dice con palabras; nunca
          // se omite dejando que un diagnóstico viejo pase por actual.
          <GreenhouseChip
            kind='metric'
            variant='label'
            size='small'
            label={staleDays === null ? GH_GROWTH_SEO_AUDIT.header.freshnessNever : GH_GROWTH_SEO_AUDIT.header.freshness(staleDays)}
          />
        }
        primaryAction={runAuditButton}
        secondaryActions={
          <CustomAutocomplete
            options={spaces}
            value={selectedSpace}
            disableClearable={false}
            getOptionLabel={(option: SeoSpaceOption | string) =>
              typeof option === 'string' ? option : option.organizationName
            }
            isOptionEqualToValue={(option: SeoSpaceOption, value: SeoSpaceOption) =>
              option.organizationId === value.organizationId
            }
            // Cambiar de Space cierra el drill: un `issueGroup` de otro sitio no existe acá
            // y dejaría la pantalla pidiendo un grupo fantasma.
            onChange={(_, value) =>
              value
                ? pushQuery({ space: (value as SeoSpaceOption).organizationId, issueGroup: null })
                : undefined
            }
            sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, minInlineSize: { md: 220 } }}
            renderInput={params => (
              <CustomTextField
                {...params}
                label={GH_GROWTH_SEO_OVERVIEW.toolbar.spaceLabel}
                placeholder={GH_GROWTH_SEO_OVERVIEW.toolbar.spacePlaceholder}
              />
            )}
          />
        }
        supporting={
          <Box data-capture='seo-audit-tabs'>
            <SeoSearchVisibilityTabs activeTab='audit' spaceId={selectedSpaceId} />
          </Box>
        }
      />
    </Stack>
  )

  const healthStrip = () => {
    if (!report?.ok) {
      return null
    }

    return (
      <Card data-capture='seo-audit-health'>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 4, sm: 6 }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Stack spacing={1} alignItems='center' sx={{ flexShrink: 0 }}>
              {report.run.healthScore === null ? (
                // Puntaje no calculado ≠ puntaje cero. Un 0/100 leería "sitio pésimo"
                // cuando en realidad el crawl no llegó a calcularlo.
                <Stack spacing={0.5} alignItems='center' sx={{ py: 4 }}>
                  <Typography variant='h5'>{GH_GROWTH_SEO_AUDIT.kpi.healthPending}</Typography>
                  <Typography variant='caption' color='text.secondary' textAlign='center'>
                    {GH_GROWTH_SEO_AUDIT.kpi.healthPendingHint}
                  </Typography>
                </Stack>
              ) : (
                <SeoHealthGauge
                  score={report.run.healthScore}
                  size={180}
                  ariaLabel={GH_GROWTH_SEO_AUDIT.kpi.healthAria(Math.round(report.run.healthScore))}
                />
              )}
              <Typography variant='caption' color='text.secondary'>
                {GH_GROWTH_SEO_AUDIT.kpi.health}
              </Typography>
            </Stack>

            <Divider orientation='vertical' flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                gap: 4,
                flex: 1,
                minInlineSize: 0
              }}
            >
              <StatBlock label={GH_GROWTH_SEO_AUDIT.kpi.critical} value={String(report.totals.critical)} />
              <StatBlock label={GH_GROWTH_SEO_AUDIT.kpi.warnings} value={String(report.totals.warning)} />
              <StatBlock label={GH_GROWTH_SEO_AUDIT.kpi.notices} value={String(report.totals.notice)} />
              <StatBlock
                label={GH_GROWTH_SEO_AUDIT.kpi.pages}
                value={report.run.crawledPages === null ? '—' : String(report.run.crawledPages)}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const issueRow = (group: SeoAuditIssueGroup, index: number) => {
    const severity = SEVERITY_PRESENTATION[group.severity]
    const isOpen = openGroup?.issueType === group.issueType

    return (
      <Box key={group.issueType} component='li' sx={{ listStyle: 'none' }}>
        {index > 0 ? <Divider /> : null}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 4 }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ py: 3.5, px: { xs: 0, sm: 1 } }}
        >
          {/* Severidad: icono + palabra + color. El chip lleva el texto adentro, así que
              quien no distingue el color sigue leyendo "Crítico". */}
          <Box sx={{ flexShrink: 0, minInlineSize: { sm: 116 } }}>
            <GreenhouseChip
              kind='status'
              size='small'
              tone={severity.tone}
              iconClassName={severity.icon}
              label={severity.label}
            />
          </Box>

          <Stack spacing={0.25} sx={{ flex: 1, minInlineSize: 0 }}>
            <Typography variant='body1' fontWeight={600}>
              {group.label}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {GH_GROWTH_SEO_AUDIT.issues.affected(group.affectedPages)}
              {' · '}
              {GH_GROWTH_SEO_AUDIT.issues.effortLabel}: {GH_GROWTH_SEO_AUDIT.effort[group.effort]}
            </Typography>
          </Stack>

          <GreenhouseButton
            id={triggerId(group.issueType)}
            kind='secondaryAction'
            variant='text'
            size='small'
            aria-expanded={isOpen}
            aria-label={GH_GROWTH_SEO_AUDIT.issues.viewAria(group.label)}
            trailingIconClassName={isOpen ? 'tabler-chevron-up' : 'tabler-chevron-right'}
            onClick={() => pushQuery({ issueGroup: isOpen ? null : group.issueType })}
            sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            {isOpen ? GH_GROWTH_SEO_AUDIT.drill.close : GH_GROWTH_SEO_AUDIT.issues.view}
          </GreenhouseButton>
        </Stack>

        {isOpen && openGroup ? drill(openGroup) : null}
      </Box>
    )
  }

  const drill = (group: SeoAuditIssueGroup) => {
    const urls = group.findings.slice(0, DRILL_URL_LIMIT)

    return (
      <Box
        data-capture='seo-audit-drill'
        sx={theme => ({
          // Costura, no card: el drill es un detalle ANIDADO en su fila, y darle borde
          // propio dentro de la card de issues sería card-on-card sin frontera semántica.
          bgcolor: 'action.hover',
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          p: { xs: 3, sm: 4 },
          mb: 3
        })}
      >
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography
              ref={drillHeadingRef}
              tabIndex={-1}
              variant='subtitle1'
              component='h3'
              sx={{ outline: 'none' }}
            >
              {GH_GROWTH_SEO_AUDIT.drill.title(group.label, group.affectedPages)}
            </Typography>
            {group.hint ? (
              <Typography variant='body2' color='text.secondary'>
                {group.hint}
              </Typography>
            ) : (
              <Typography variant='body2' color='text.secondary'>
                {GH_GROWTH_SEO_AUDIT.issues.unknownIssueHint}
              </Typography>
            )}
          </Stack>

          <DataTableShell
            identifier={`seo-audit-drill-${group.issueType}`}
            ariaLabel={GH_GROWTH_SEO_AUDIT.drill.title(group.label, group.affectedPages)}
            density='compact'
          >
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell scope='col'>{GH_GROWTH_SEO_AUDIT.drill.colUrl}</TableCell>
                  <TableCell scope='col'>{GH_GROWTH_SEO_AUDIT.drill.colDetail}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {urls.map((finding, index) => {
                  const status = finding.detail?.httpStatusCode
                  const score = finding.detail?.onpageScore

                  const detail = [
                    typeof status === 'number' ? GH_GROWTH_SEO_AUDIT.drill.httpStatus(status) : null,
                    typeof score === 'number' ? GH_GROWTH_SEO_AUDIT.drill.onpageScore(Math.round(score)) : null
                  ]
                    .filter(Boolean)
                    .join(' · ')

                  return (
                    <TableRow key={`${finding.url}-${index}`}>
                      <TableCell sx={{ maxInlineSize: 520, wordBreak: 'break-all' }}>{finding.url}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {detail || GH_GROWTH_SEO_AUDIT.drill.detailEmpty}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </DataTableShell>

          {group.findings.length > urls.length ? (
            <Typography variant='caption' color='text.secondary'>
              {GH_GROWTH_SEO_AUDIT.drill.truncated(urls.length, group.findings.length)}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    )
  }

  const issuesList = () => (
    <Card data-capture='seo-audit-issues'>
      <CardContent>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant='h5' component='h2'>
            {GH_GROWTH_SEO_AUDIT.issues.title}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {GH_GROWTH_SEO_AUDIT.issues.subtitle}
          </Typography>
          {/* El esfuerzo es juicio nuestro, no medición del crawl: se declara una vez,
              acá, en lugar de repetirlo como tooltip en cada fila. */}
          <Typography variant='caption' color='text.secondary'>
            {GH_GROWTH_SEO_AUDIT.issues.effortHint}
          </Typography>
        </Stack>

        <Box component='ul' sx={{ m: 0, p: 0 }} aria-busy={isPending}>
          {groups.map((group, index) => issueRow(group, index))}
        </Box>
      </CardContent>
    </Card>
  )

  const renderBody = () => {
    // Sin ningún Space con el módulo contratado: condición de negocio, no error.
    if (spaces.length === 0 || !selectedSpaceId) {
      return (
        <Box data-capture='seo-audit-empty'>
          <EmptyState
            icon='tabler-lock'
            title={GH_GROWTH_SEO_AUDIT.states.noSpacesTitle}
            description={GH_GROWTH_SEO_AUDIT.states.noSpacesDescription}
          />
        </Box>
      )
    }

    // Space elegible pero sin sitio configurado: el camino es configurar, no auditar.
    if (!seoTargetId) {
      return (
        <Box data-capture='seo-audit-empty'>
          <EmptyState
            icon='tabler-world-off'
            title={GH_GROWTH_SEO_AUDIT.states.noTargetTitle}
            description={GH_GROWTH_SEO_AUDIT.states.noTargetDescription}
          />
        </Box>
      )
    }

    if (!report || !report.ok) {
      // `no_data` es "nunca se auditó" — un vacío accionable, no una falla. El resto de
      // los códigos SÍ son falla de lectura y llevan reintento.
      const isNeverAudited = report?.errorCode === 'no_data'

      return (
        <Box data-capture='seo-audit-empty'>
          <EmptyState
            icon={isNeverAudited ? 'tabler-radar' : 'tabler-alert-triangle'}
            title={isNeverAudited ? GH_GROWTH_SEO_AUDIT.states.emptyTitle : GH_GROWTH_SEO_AUDIT.states.readerErrorTitle}
            description={
              isNeverAudited
                ? rootDomain
                  ? GH_GROWTH_SEO_AUDIT.states.emptyDescription(rootDomain)
                  : GH_GROWTH_SEO_AUDIT.states.emptyDescriptionNoDomain
                : GH_GROWTH_SEO_AUDIT.states.readerErrorDescription
            }
            action={
              isNeverAudited ? (
                // Un vacío accionable lleva el camino adentro: sin la capability el CTA no
                // existe y el estado se queda en la explicación, que sigue siendo honesta.
                (runAuditButton ?? undefined)
              ) : (
                <GreenhouseButton kind='primaryAction' onClick={() => router.refresh()}>
                  {GH_GROWTH_SEO_AUDIT.states.readerErrorCta}
                </GreenhouseButton>
              )
            }
          />
          {runMessage ? (
            <Alert severity={runMessage.severity} sx={{ mt: 4 }} data-capture='seo-audit-run-feedback'>
              {runMessage.text}
            </Alert>
          ) : null}
        </Box>
      )
    }

    const status = report.run.status
    const hasFindings = groups.length > 0

    return (
      <Stack spacing={6}>
        {runMessage ? (
          <Alert severity={runMessage.severity} data-capture='seo-audit-run-feedback'>
            {runMessage.text}
          </Alert>
        ) : null}

        {/* Un crawl en curso no tiene findings todavía: se dice, y no se pinta una lista
            vacía que se leería como "sitio limpio". Son hechos distintos. */}
        {status === 'running' ? (
          <Alert severity='info' icon={<i className='tabler-loader' />} data-capture='seo-audit-running'>
            <AlertTitle>{GH_GROWTH_SEO_AUDIT.states.runningTitle}</AlertTitle>
            {rootDomain
              ? GH_GROWTH_SEO_AUDIT.states.runningDescription(rootDomain)
              : GH_GROWTH_SEO_AUDIT.states.runningDescriptionNoDomain}
          </Alert>
        ) : null}

        {status === 'degraded' ? (
          <Alert severity='warning' data-capture='seo-audit-degraded'>
            <AlertTitle>{GH_GROWTH_SEO_AUDIT.states.degradedTitle}</AlertTitle>
            {GH_GROWTH_SEO_AUDIT.states.degradedDescription}
          </Alert>
        ) : null}

        {status === 'failed' ? (
          <Alert severity='error' data-capture='seo-audit-failed'>
            <AlertTitle>{GH_GROWTH_SEO_AUDIT.states.failedTitle}</AlertTitle>
            {GH_GROWTH_SEO_AUDIT.states.failedDescription}
          </Alert>
        ) : null}

        {/* Pasado el umbral, el freshness deja de ser contexto y pasa a ser advertencia. */}
        {staleDays !== null && staleDays > STALE_CRAWL_DAYS && status !== 'running' ? (
          <Alert severity='warning' data-capture='seo-audit-stale'>
            {GH_GROWTH_SEO_AUDIT.header.freshnessStale}
          </Alert>
        ) : null}

        {healthStrip()}

        {hasFindings ? (
          issuesList()
        ) : status === 'running' ? null : (
          <Box data-capture='seo-audit-issues'>
            <EmptyState
              icon='tabler-circle-check'
              title={GH_GROWTH_SEO_AUDIT.states.cleanTitle}
              description={GH_GROWTH_SEO_AUDIT.states.cleanDescription}
            />
          </Box>
        )}
      </Stack>
    )
  }

  return (
    // Recipe `analyticsReport` (composición `single`), igual que Rendimiento.
    // `plane='none'`: el contenido primario YA es una composición de cards; el plane
    // contenido de la recipe fabricaría card-on-card.
    <SurfaceRecipe
      kind='analyticsReport'
      instanceId='seo-audit'
      plane='none'
      header={header}
      regions={{ primary: renderBody() }}
    />
  )
}

export default SiteAuditView
