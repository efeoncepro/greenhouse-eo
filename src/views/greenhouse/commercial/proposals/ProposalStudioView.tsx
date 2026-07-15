'use client'

/**
 * TASK-1413 — Proposal Studio: ventana operador (lista + sidecar de versiones + descarga).
 *
 * Contrato de diseño: docs/ui/wireframes/TASK-1413-proposal-studio-surface.md +
 * docs/ui/flows/TASK-1413-proposal-studio-surface-flow.md. Superficie READ + DOWNLOAD:
 * cero mutación del aggregate. La descarga es un anchor nativo al endpoint gobernado
 * (TASK-1412) — la UI jamás conoce URLs de storage.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'

import type { ThemeColor } from '@core/types'

import AdaptiveSidecarLayout from '@/components/greenhouse/primitives/AdaptiveSidecarLayout'
import ContextualSidecar from '@/components/greenhouse/primitives/ContextualSidecar'
import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import { getMicrocopy } from '@/lib/copy'
import { formatDate } from '@/lib/format'
import { GH_PROPOSALS } from '@/lib/copy/commercial-proposals'
import type {
  ProposalArtifactKindHistory,
  ProposalArtifactVersion
} from '@/lib/commercial/tenders/proposals/artifact-versions'
import type { ProposalOperatorRow } from '@/lib/commercial/tenders/proposals/operator-view'

// ── Presentación derivada del dominio (labels desde copy; tono semántico acá) ──────────────────

const STATE_LABEL: Record<string, string> = {
  intake: GH_PROPOSALS.state_intake,
  analyzing: GH_PROPOSALS.state_analyzing,
  analyzed: GH_PROPOSALS.state_analyzed,
  fit_review: GH_PROPOSALS.state_fit_review,
  declined: GH_PROPOSALS.state_declined,
  producing: GH_PROPOSALS.state_producing,
  base_ready: GH_PROPOSALS.state_base_ready,
  packaging: GH_PROPOSALS.state_packaging,
  ready_to_submit: GH_PROPOSALS.state_ready_to_submit,
  submitted: GH_PROPOSALS.state_submitted,
  won: GH_PROPOSALS.state_won,
  lost: GH_PROPOSALS.state_lost
}

const STATE_COLOR: Record<string, ThemeColor> = {
  intake: 'secondary',
  analyzing: 'info',
  analyzed: 'info',
  fit_review: 'warning',
  declined: 'secondary',
  producing: 'primary',
  base_ready: 'primary',
  packaging: 'primary',
  ready_to_submit: 'warning',
  submitted: 'info',
  won: 'success',
  lost: 'secondary'
}

const ORIGIN_LABEL: Record<string, string> = {
  public_tender: GH_PROPOSALS.origin_public_tender,
  private_rfp: GH_PROPOSALS.origin_private_rfp,
  direct_sales: GH_PROPOSALS.origin_direct_sales
}

const KIND_LABEL: Record<string, string> = {
  rfp_source: GH_PROPOSALS.kind_rfp_source,
  fillable_template: GH_PROPOSALS.kind_fillable_template,
  diagnostic: GH_PROPOSALS.kind_diagnostic,
  technical_offer: GH_PROPOSALS.kind_technical_offer,
  economic_offer: GH_PROPOSALS.kind_economic_offer,
  admissibility_matrix: GH_PROPOSALS.kind_admissibility_matrix,
  deck: GH_PROPOSALS.kind_deck,
  other_doc: GH_PROPOSALS.kind_other_doc
}

const stateLabelFor = (row: Pick<ProposalOperatorRow, 'state' | 'origin'>): string =>
  row.state === 'won' && row.origin === 'public_tender'
    ? GH_PROPOSALS.state_won_public_tender
    : (STATE_LABEL[row.state] ?? row.state)

const formatDeadline = (iso: string | null): string => {
  if (!iso) return '—'

  const formatted = formatDate(iso)

  return formatted || '—'
}

const formatBytes = (bytes: number | null): string => {
  if (bytes === null || bytes <= 0) return '—'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Data hooks (readers gobernados; jamás storage directo) ──────────────────────────────────────

type ListState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; rows: ProposalOperatorRow[] }

type VersionsState =
  | { kind: 'loading' }
  | { kind: 'degraded' }
  | { kind: 'loaded'; kinds: ProposalArtifactKindHistory[] }

const ProposalStudioView = ({ ownerOrgId }: { ownerOrgId: string | null }) => {
  const micro = getMicrocopy()
  const searchParams = useSearchParams()

  const [list, setList] = useState<ListState>({ kind: 'loading' })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [versions, setVersions] = useState<VersionsState>({ kind: 'loading' })
  const [stateFilter, setStateFilter] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    if (!ownerOrgId) {
      setList({ kind: 'loaded', rows: [] })

      return
    }

    setList({ kind: 'loading' })

    try {
      const res = await fetch(
        `/api/commercial/proposals/operator-view?ownerOrgId=${encodeURIComponent(ownerOrgId)}&includeClosed=true`
      )

      if (!res.ok) throw new Error(String(res.status))
      const payload = (await res.json()) as { rows?: ProposalOperatorRow[]; items?: ProposalOperatorRow[] }

      setList({ kind: 'loaded', rows: payload.rows ?? payload.items ?? [] })
    } catch {
      setList({ kind: 'error' })
    }
  }, [ownerOrgId])

  useEffect(() => {
    void loadList()
  }, [loadList])

  // Deep-link ?proposal=<id> (flow contract): id inválido degrada suave (no abre nada).
  useEffect(() => {
    const fromUrl = searchParams.get('proposal')

    if (fromUrl && list.kind === 'loaded' && list.rows.some(r => r.proposalId === fromUrl)) {
      setSelectedId(fromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.kind])

  useEffect(() => {
    if (!selectedId || !ownerOrgId) return

    let cancelled = false

    setVersions({ kind: 'loading' })
    fetch(
      `/api/commercial/proposals/${encodeURIComponent(selectedId)}/assets/versions?ownerOrgId=${encodeURIComponent(ownerOrgId)}`
    )
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((payload: { kinds: ProposalArtifactKindHistory[] }) => {
        if (!cancelled) setVersions({ kind: 'loaded', kinds: payload.kinds })
      })
      .catch(() => {
        if (!cancelled) setVersions({ kind: 'degraded' })
      })

    return () => {
      cancelled = true
    }
  }, [selectedId, ownerOrgId])

  const rows = useMemo(() => (list.kind === 'loaded' ? list.rows : []), [list])

  const filteredRows = useMemo(
    () => (stateFilter ? rows.filter(row => row.state === stateFilter) : rows),
    [rows, stateFilter]
  )

  const presentStates = useMemo(() => [...new Set(rows.map(row => row.state))], [rows])
  const selected = rows.find(row => row.proposalId === selectedId) ?? null

  const downloadHref = (version: ProposalArtifactVersion): string =>
    `/api/commercial/proposals/${encodeURIComponent(selectedId ?? '')}/assets/${encodeURIComponent(version.proposalAssetId)}/download?ownerOrgId=${encodeURIComponent(ownerOrgId ?? '')}`

  // ── Sidecar (S4) ──────────────────────────────────────────────────────────────────────────────

  const sidecar = selected ? (
    <ContextualSidecar
      title={selected.title}
      eyebrow={ORIGIN_LABEL[selected.origin] ?? selected.origin}
      subtitle={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip size='small' label={stateLabelFor(selected)} color={STATE_COLOR[selected.state] ?? 'secondary'} variant='tonal' />
          <Typography variant='body2' color='text.secondary'>
            {GH_PROPOSALS.col_deadline}: {formatDeadline(selected.deadline)}
          </Typography>
        </Box>
      }
      icon='tabler-files'
      onClose={() => setSelectedId(null)}
      closeLabel={GH_PROPOSALS.sidecar_close_aria}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Typography variant='h6'>{GH_PROPOSALS.sidecar_versions_title}</Typography>

        {versions.kind === 'loading' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant='rounded' height={56} />
            <Skeleton variant='rounded' height={56} />
            <Skeleton variant='rounded' height={56} />
          </Box>
        )}

        {versions.kind === 'degraded' && <Alert severity='warning'>{GH_PROPOSALS.versions_unavailable}</Alert>}

        {versions.kind === 'loaded' && versions.kinds.length === 0 && (
          <Typography variant='body2' color='text.secondary'>
            {GH_PROPOSALS.no_artifacts}
          </Typography>
        )}

        {versions.kind === 'loaded' &&
          versions.kinds.map(group => (
            <Accordion key={group.kind} defaultExpanded={group.kind === 'deck'} disableGutters>
              <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                    {KIND_LABEL[group.kind] ?? group.kind}
                  </Typography>
                  <Chip size='small' variant='tonal' color='primary' label={`v${group.current.version}`} />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.history.map(version => {
                  const isCurrent = version.proposalAssetId === group.current.proposalAssetId

                  return (
                    <Box
                      key={version.proposalAssetId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        p: 3,
                        borderRadius: 1,
                        border: theme => `1px solid ${theme.palette.divider}`,
                        ...(isCurrent && {
                          borderColor: 'primary.main',
                          backgroundColor: theme => theme.palette.action.hover
                        })
                      }}
                    >
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          <Typography variant='subtitle2'>v{version.version}</Typography>
                          {isCurrent && (
                            <Chip size='small' variant='tonal' color='success' label={GH_PROPOSALS.version_current} />
                          )}
                          {version.audience === 'internal' && (
                            <Tooltip title={GH_PROPOSALS.audience_internal_tooltip}>
                              <Chip size='small' variant='outlined' color='warning' label={GH_PROPOSALS.audience_internal} />
                            </Tooltip>
                          )}
                        </Box>
                        <Typography variant='body2' color='text.secondary' noWrap title={version.fileName ?? undefined}>
                          {version.fileName ?? '—'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {formatBytes(version.sizeBytes)} · {formatDeadline(version.createdAt)}
                        </Typography>
                      </Box>
                      <Button
                        component='a'
                        href={downloadHref(version)}
                        size='small'
                        variant='tonal'
                        color='primary'
                        startIcon={<i className='tabler-download' />}
                        aria-label={GH_PROPOSALS.download_aria(KIND_LABEL[group.kind] ?? group.kind, version.version)}
                      >
                        {GH_PROPOSALS.download_cta}
                      </Button>
                    </Box>
                  )
                })}
              </AccordionDetails>
            </Accordion>
          ))}
      </Box>
    </ContextualSidecar>
  ) : null

  // ── Tabla (S3) ────────────────────────────────────────────────────────────────────────────────

  return (
    <AdaptiveSidecarLayout
      open={selectedId !== null}
      onOpenChange={open => !open && setSelectedId(null)}
      kind='inspector'
      preferredMode='temporary'
      sidecarWidth={480}
      sidecarMinWidth={420}
      sidecarMaxWidth={560}
      sidecar={sidecar}
    >
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant='h4'>{GH_PROPOSALS.header_title}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {GH_PROPOSALS.header_subtitle}
              </Typography>
            </Box>
            <Tooltip title={micro.actions.refresh}>
              <IconButton aria-label={micro.actions.refresh} onClick={() => void loadList()}>
                <i className='tabler-refresh' />
              </IconButton>
            </Tooltip>
          </Box>

          {list.kind === 'loaded' && rows.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                size='small'
                label={GH_PROPOSALS.filter_all_states}
                color={stateFilter === null ? 'primary' : 'secondary'}
                variant={stateFilter === null ? 'tonal' : 'outlined'}
                onClick={() => setStateFilter(null)}
              />
              {presentStates.map(state => (
                <Chip
                  key={state}
                  size='small'
                  label={STATE_LABEL[state] ?? state}
                  color={stateFilter === state ? 'primary' : 'secondary'}
                  variant={stateFilter === state ? 'tonal' : 'outlined'}
                  onClick={() => setStateFilter(current => (current === state ? null : state))}
                />
              ))}
            </Box>
          )}

          {list.kind === 'loading' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} variant='rounded' height={52} />
              ))}
            </Box>
          )}

          {list.kind === 'error' && (
            <Alert
              severity='error'
              action={
                <Button color='inherit' size='small' onClick={() => void loadList()}>
                  {GH_PROPOSALS.retry_cta}
                </Button>
              }
            >
              <Typography variant='subtitle2'>{GH_PROPOSALS.error_title}</Typography>
              {GH_PROPOSALS.error_body}
            </Alert>
          )}

          {list.kind === 'loaded' && rows.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <i className='tabler-files' style={{ fontSize: '2.5rem', opacity: 0.4 }} />
              <Typography variant='h6'>{GH_PROPOSALS.empty_title}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 480 }}>
                {GH_PROPOSALS.empty_body}
              </Typography>
            </Box>
          )}

          {list.kind === 'loaded' && filteredRows.length > 0 && (
            <DataTableShell identifier='proposal-studio' ariaLabel={GH_PROPOSALS.header_title}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{GH_PROPOSALS.col_proposal}</TableCell>
                    <TableCell>{GH_PROPOSALS.col_origin}</TableCell>
                    <TableCell>{GH_PROPOSALS.col_state}</TableCell>
                    <TableCell>{GH_PROPOSALS.col_deadline}</TableCell>
                    <TableCell align='right'>{GH_PROPOSALS.col_artifacts}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.map(row => (
                    <TableRow
                      key={row.proposalId}
                      hover
                      selected={row.proposalId === selectedId}
                      onClick={() => setSelectedId(row.proposalId)}
                      sx={{ cursor: 'pointer' }}
                      aria-expanded={row.proposalId === selectedId}
                    >
                      <TableCell>
                        <Typography variant='subtitle2'>{row.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{ORIGIN_LABEL[row.origin] ?? row.origin}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size='small' variant='tonal' color={STATE_COLOR[row.state] ?? 'secondary'} label={stateLabelFor(row)} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant='body2'
                            color={row.deadlineRisk === 'expired' || row.deadlineRisk === 'at_risk' ? 'error.main' : 'text.primary'}
                          >
                            {formatDeadline(row.deadline)}
                          </Typography>
                          {row.deadlineConfidence !== 'declared' && row.deadline && (
                            <Tooltip title={GH_PROPOSALS.deadline_assumed_tooltip}>
                              <i className='tabler-info-circle' style={{ fontSize: '1rem', opacity: 0.6 }} />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>{row.counts.assets > 0 ? row.counts.assets : '—'}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          )}

          {list.kind === 'loaded' && rows.length > 0 && (
            <Typography variant='caption' color='text.secondary'>
              {GH_PROPOSALS.showing_count(filteredRows.length, rows.length)}
            </Typography>
          )}
        </CardContent>
      </Card>
    </AdaptiveSidecarLayout>
  )
}

export default ProposalStudioView
