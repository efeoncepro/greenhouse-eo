'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { toast } from 'sonner'

import CustomAvatar from '@core/components/mui/Avatar'

import EmptyState from '@/components/greenhouse/EmptyState'
import { OperationalStatusBadge } from '@/components/greenhouse/primitives'
import { GH_WORKFORCE_CONTRACTING as C } from '@/lib/copy/workforce-contracting'
import type { ContractingDraftContent } from '@/lib/workforce/contracting/readers'

interface Props {
  caseId: string | null
  canApprove: boolean
  canManage: boolean
  onChanged: () => void
}

type SectionRow = {
  code: string
  esHeading: string | null
  esBody: string | null
  enHeading: string | null
  enBody: string | null
  parity: 'ok' | 'missing'
}

const BilingualReviewDesk = ({ caseId, canApprove, canManage, onChanged }: Props) => {
  const theme = useTheme()
  const [content, setContent] = useState<ContractingDraftContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoading(true)

    try {
      const res = await fetch(`/api/hr/workforce/contracting/${encodeURIComponent(id)}/draft-content`)
      const data = (await res.json()) as { content: ContractingDraftContent | null }

      setContent(data.content ?? null)
    } catch {
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (caseId) {
      void load(caseId)
    } else {
      setContent(null)
    }
  }, [caseId, load])

  const rows = useMemo<SectionRow[]>(() => {
    const sc = content?.structuredContent

    if (!sc) return []

    const es = sc.localizedDrafts['es-CL']?.sections ?? []
    const en = sc.localizedDrafts['en-US']?.sections ?? []
    const codes = Array.from(new Set([...es.map(s => s.sectionCode), ...en.map(s => s.sectionCode)]))

    return codes.map(code => {
      const esS = es.find(s => s.sectionCode === code) ?? null
      const enS = en.find(s => s.sectionCode === code) ?? null

      return {
        code,
        esHeading: esS?.heading ?? null,
        esBody: esS?.body ?? null,
        enHeading: enS?.heading ?? null,
        enBody: enS?.body ?? null,
        parity: esS && enS ? 'ok' : 'missing'
      }
    })
  }, [content])

  const blockers = content?.validation?.blockers ?? []
  const parityStatus = content?.validation?.languageParity?.status ?? 'unknown'

  const handleApprove = useCallback(async () => {
    if (!content) return
    setBusy(true)

    try {
      const res = await fetch(`/api/hr/workforce/contracting/drafts/${encodeURIComponent(content.draftId)}/approve`, { method: 'POST' })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(payload.error || C.review.approveError)
      }

      toast.success(C.review.approved)
      onChanged()
      if (caseId) void load(caseId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : C.review.approveError)
    } finally {
      setBusy(false)
    }
  }, [content, onChanged, caseId, load])

  const handleGeneratePdf = useCallback(async () => {
    if (!caseId) return
    setBusy(true)

    try {
      const res = await fetch(`/api/hr/workforce/contracting/${encodeURIComponent(caseId)}/generate-document`, { method: 'POST' })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(payload.error || C.review.generatePdfError)
      }

      const data = (await res.json()) as { pdfAssetId?: string }

      toast.success(C.review.generatePdfDone)
      onChanged()
      void load(caseId)

      if (data.pdfAssetId) {
        window.open(`/api/assets/private/${encodeURIComponent(data.pdfAssetId)}`, '_blank', 'noopener')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : C.review.generatePdfError)
    } finally {
      setBusy(false)
    }
  }, [caseId, onChanged, load])

  const handleVoid = useCallback(async () => {
    if (!caseId) return
    const reason = window.prompt(C.actions.void + ' — motivo (mín. 5 caracteres):')?.trim()

    if (!reason || reason.length < 5) return

    setBusy(true)

    try {
      const res = await fetch(`/api/hr/workforce/contracting/${encodeURIComponent(caseId)}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(payload.error || C.review.voidError)
      }

      toast.success(C.review.voided)
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : C.review.voidError)
    } finally {
      setBusy(false)
    }
  }, [caseId, onChanged])

  const handleGenerate = useCallback(async () => {
    if (!caseId) return
    setBusy(true)

    try {
      const res = await fetch(`/api/hr/workforce/contracting/${encodeURIComponent(caseId)}/ai-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (res.status === 409) {
        toast.message(C.review.aiDisabled)

        return
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(payload.error || C.create.error)
      }

      toast.success(C.create.success)
      onChanged()
      void load(caseId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : C.create.error)
    } finally {
      setBusy(false)
    }
  }, [caseId, onChanged, load])

  if (!caseId) {
    return (
      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <CardContent>
          <EmptyState icon='tabler-columns-3' title={C.bilingualReview} description={C.review.selectFromQueue} />
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <CardContent>
          <Stack spacing={2} aria-busy='true' aria-label={C.states.loadingDetail}>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={22} />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (!content) {
    return (
      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <CardContent>
          <EmptyState
            icon='tabler-file-off'
            title={C.review.noDraftTitle}
            description={C.review.noDraftBody}
            action={
              canManage ? (
                <Button variant='contained' onClick={handleGenerate} disabled={busy} startIcon={<i className='tabler-sparkles' aria-hidden='true' />}>
                  {C.review.generateDraft}
                </Button>
              ) : undefined
            }
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Stack spacing={3} data-capture='workforce-contracting-bilingual-review'>
      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2} alignItems={{ md: 'center' }}>
            <Stack spacing={0.5}>
              <Typography variant='h5'>{C.bilingualReview}</Typography>
              <Typography variant='body2' color='text.secondary'>
                v{content.draftVersion} · {content.source}
              </Typography>
            </Stack>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap alignItems='center'>
              <OperationalStatusBadge
                tone={parityStatus === 'pass' ? 'success' : parityStatus === 'fail' ? 'error' : 'secondary'}
                label={`${C.review.structuralParity}: ${(C.parityLabels as Record<string, string>)[parityStatus] ?? parityStatus}`}
                icon='tabler-language'
              />
              {blockers.length > 0 ? (
                <OperationalStatusBadge tone='error' label={`${C.detail.blockers}: ${blockers.length}`} icon='tabler-alert-triangle' />
              ) : (
                <OperationalStatusBadge tone='success' label={C.detail.noBlockers} icon='tabler-circle-check' />
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }} tabIndex={0} aria-label={C.aria.bilingualReviewTable}>
            <Table sx={{ minWidth: 900 }}>
              <caption className='sr-only'>{C.aria.bilingualReviewTable}</caption>
              <TableHead>
                <TableRow>
                  <TableCell scope='col' sx={{ width: 90 }}>
                    {C.review.sectionsHeader}
                  </TableCell>
                  <TableCell scope='col'>{C.authoritativeSpanish} (es-CL)</TableCell>
                  <TableCell scope='col'>English (en-US)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow
                    key={row.code}
                    sx={{
                      bgcolor: row.parity === 'missing' ? alpha(theme.palette.error.main, 0.055) : undefined,
                      boxShadow: row.parity === 'missing' ? `inset 3px 0 0 ${theme.palette.error.main}` : undefined
                    }}
                  >
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Typography variant='subtitle2' color={row.parity === 'missing' ? 'error.main' : 'text.primary'}>
                        {row.code}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Typography variant='subtitle2'>{row.esHeading ?? C.detail.notAvailable}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {row.esBody ?? C.detail.notAvailable}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      <Typography variant='subtitle2'>{row.enHeading ?? C.detail.notAvailable}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {row.enBody ?? C.detail.notAvailable}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      {blockers.length > 0 ? (
        <Card sx={{ boxShadow: 'none', border: theme => `1px solid ${alpha(theme.palette.error.main, 0.24)}`, bgcolor: alpha(theme.palette.error.main, 0.05) }}>
          <CardContent>
            <Stack direction='row' spacing={1.5} alignItems='flex-start'>
              <CustomAvatar skin='light' color='error' variant='rounded'>
                <i className='tabler-alert-triangle' aria-hidden='true' />
              </CustomAvatar>
              <Box>
                <Typography variant='subtitle2' color='error.main' sx={{ mb: 0.5 }}>
                  {C.detail.blockers} ({blockers.length})
                </Typography>
                <Stack spacing={0.5}>
                  {blockers.map((b, idx) => (
                    <Typography key={`${b.code ?? idx}`} variant='body2' color='text.secondary'>
                      • {b.message ?? b.code}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Card sx={{ position: 'sticky', bottom: 16, zIndex: 2, boxShadow: theme.shadows[8], border: `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ py: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='flex-end' spacing={1.5}>
            {canManage ? (
              <Button variant='outlined' color='error' disabled={busy} onClick={handleVoid} startIcon={<i className='tabler-ban' aria-hidden='true' />}>
                {C.actions.void}
              </Button>
            ) : null}
            {canManage ? (
              <Button
                variant='outlined'
                disabled={busy || content?.status !== 'approved_for_pdf'}
                onClick={handleGeneratePdf}
                startIcon={busy ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-file-type-pdf' aria-hidden='true' />}
              >
                {busy ? C.review.generating : C.generatePdf}
              </Button>
            ) : null}
            {canApprove ? (
              <Button
                variant='contained'
                disabled={busy || blockers.length > 0}
                onClick={handleApprove}
                startIcon={busy ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-circle-check' aria-hidden='true' />}
              >
                {busy ? C.review.approving : C.review.approve}
              </Button>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default BilingualReviewDesk
