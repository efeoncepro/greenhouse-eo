'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import { GH_PRICING_GOVERNANCE } from '@/lib/copy/pricing'

interface DiffRow {
  entityType: string
  entityId: string | null
  entitySku: string | null
  action: 'create' | 'update' | 'delete' | 'noop'
  currentValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  fieldsChanged: string[]
  warnings: string[]
}

interface PreviewResponse {
  diffs: DiffRow[]
  metadata: {
    rolesProcessed: number
    toolsProcessed: number
    overheadsProcessed: number
    errors: Array<{ sheet: string; row: number; message: string }>
  }
}

const ACTION_COLOR: Record<DiffRow['action'], 'success' | 'info' | 'error' | 'secondary'> = {
  create: 'success',
  update: 'info',
  delete: 'error',
  noop: 'secondary'
}

const ACTION_LABEL: Record<DiffRow['action'], string> = {
  create: GH_PRICING_GOVERNANCE.excel.diffActionCreate,
  update: GH_PRICING_GOVERNANCE.excel.diffActionUpdate,
  delete: GH_PRICING_GOVERNANCE.excel.diffActionDelete,
  noop: GH_PRICING_GOVERNANCE.excel.diffActionNoop
}

const ExcelImportView = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [proposing, setProposing] = useState(false)
  const [applyResult, setApplyResult] = useState<{ applied: number; failed: number } | null>(null)
  const [proposalResult, setProposalResult] = useState<{ proposed: number } | null>(null)

  const handleExport = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/pricing-catalog/export-excel', {
        method: 'GET',
        credentials: 'same-origin'
      })

      if (!response.ok) {
        setError(GH_PRICING_GOVERNANCE.excel.exportErrorToast)

        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url
      a.download = `pricing-catalog-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError(GH_PRICING_GOVERNANCE.excel.exportErrorToast)
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError(GH_PRICING_GOVERNANCE.excel.dropzoneInvalidType)

      return
    }

    setError(null)
    setUploading(true)
    setPreview(null)
    setApplyResult(null)
    setProposalResult(null)

    try {
      const formData = new FormData()

      formData.append('file', file)

      const response = await fetch('/api/admin/pricing-catalog/import-excel/preview', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }

        setError(payload.error || GH_PRICING_GOVERNANCE.excel.parseErrorLabel)

        return
      }

      const data = (await response.json()) as PreviewResponse

      setPreview(data)

      // Preselect actionable rows so the operator can split between direct
      // apply (updates) and approval proposal (create/delete) without re-selecting.
      const preselected = new Set<string>()

      data.diffs.forEach(diff => {
        if (diff.action !== 'noop' && diff.entityId) preselected.add(diff.entityId)
      })
      setSelected(preselected)
    } catch {
      setError(GH_PRICING_GOVERNANCE.excel.parseErrorLabel)
    } finally {
      setUploading(false)
    }
  }, [])

  const toggleDiff = (entityId: string | null) => {
    if (!entityId) return
    setSelected(prev => {
      const next = new Set(prev)

      if (next.has(entityId)) next.delete(entityId)
      else next.add(entityId)

      return next
    })
  }

  const handleApply = useCallback(async () => {
    if (!preview) return

    const diffsToApply = preview.diffs.filter(
      diff => diff.action === 'update' && diff.entityId && selected.has(diff.entityId)
    )

    if (diffsToApply.length === 0) return

    setApplying(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/pricing-catalog/import-excel/apply', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diffsToApply })
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }

        setError(payload.error || GH_PRICING_GOVERNANCE.excel.applyErrorToast)

        return
      }

      const data = (await response.json()) as { applied: number; failed: number }

      setApplyResult(data)
    } catch {
      setError(GH_PRICING_GOVERNANCE.excel.applyErrorToast)
    } finally {
      setApplying(false)
    }
  }, [preview, selected])

  const handleProposeApproval = useCallback(async () => {
    if (!preview) return

    const diffsToPropose = preview.diffs.filter(
      diff => (diff.action === 'create' || diff.action === 'delete') && diff.entityId && selected.has(diff.entityId)
    )

    if (diffsToPropose.length === 0) return

    setProposing(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/pricing-catalog/import-excel/propose', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diffsToPropose })
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }

        setError(payload.error || GH_PRICING_GOVERNANCE.excel.proposeErrorToast)

        return
      }

      const data = (await response.json()) as { approvals?: Array<{ approvalId: string }> }

      setProposalResult({ proposed: data.approvals?.length ?? diffsToPropose.length })

      setSelected(prev => {
        const next = new Set(prev)

        diffsToPropose.forEach(diff => {
          if (diff.entityId) next.delete(diff.entityId)
        })

        return next
      })
    } catch {
      setError(GH_PRICING_GOVERNANCE.excel.proposeErrorToast)
    } finally {
      setProposing(false)
    }
  }, [preview, selected])

  const diffSummary = useMemo(() => {
    if (!preview) {
      return {
        processed: 0,
        applicableNow: 0,
        selectedApplicable: 0,
        selectedForApproval: 0,
        createCount: 0,
        deleteCount: 0,
        noopCount: 0,
        followupCount: 0
      }
    }

    const applicableNow = preview.diffs.filter(diff => diff.action === 'update' && Boolean(diff.entityId))

    const approvalRequired = preview.diffs.filter(
      diff => (diff.action === 'create' || diff.action === 'delete') && Boolean(diff.entityId)
    )

    const createCount = preview.diffs.filter(diff => diff.action === 'create').length
    const deleteCount = preview.diffs.filter(diff => diff.action === 'delete').length

    return {
      processed:
        preview.metadata.rolesProcessed +
        preview.metadata.toolsProcessed +
        preview.metadata.overheadsProcessed,
      applicableNow: applicableNow.length,
      selectedApplicable: applicableNow.filter(diff => diff.entityId && selected.has(diff.entityId)).length,
      selectedForApproval: approvalRequired.filter(diff => diff.entityId && selected.has(diff.entityId)).length,
      createCount,
      deleteCount,
      noopCount: preview.diffs.filter(diff => diff.action === 'noop').length,
      followupCount: createCount + deleteCount
    }
  }, [preview, selected])

  const getDiffStatus = (diff: DiffRow) => {
    if (diff.action === 'update' && diff.entityId) {
      return {
        label: GH_PRICING_GOVERNANCE.excel.diffStatusApplyNow,
        helper: GH_PRICING_GOVERNANCE.excel.applyReadyHelper,
        severity: 'success' as const,
        selectable: true
      }
    }

    if (diff.action === 'create') {
      return {
        label: GH_PRICING_GOVERNANCE.excel.diffStatusNeedsFollowup,
        helper: GH_PRICING_GOVERNANCE.excel.followupCreateLabel,
        severity: 'warning' as const,
        selectable: true
      }
    }

    if (diff.action === 'delete') {
      return {
        label: GH_PRICING_GOVERNANCE.excel.diffStatusNeedsFollowup,
        helper: GH_PRICING_GOVERNANCE.excel.followupDeleteLabel,
        severity: 'warning' as const,
        selectable: true
      }
    }

    return {
      label: GH_PRICING_GOVERNANCE.excel.diffStatusNoChanges,
      helper: GH_PRICING_GOVERNANCE.excel.noDiffsLabel,
      severity: 'secondary' as const,
      selectable: false
    }
  }

  return (
    <Stack spacing={3}>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={GH_PRICING_GOVERNANCE.excel.importPageTitle}
          subheader={GH_PRICING_GOVERNANCE.excel.importPageSubtitle}
        />
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            <Button
              variant='outlined'
              startIcon={<i className='tabler-download' />}
              onClick={() => void handleExport()}
            >
              {GH_PRICING_GOVERNANCE.excel.exportCta}
            </Button>

            <Divider />

            <Button
              variant='contained'
              startIcon={<i className='tabler-upload' />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading
                ? GH_PRICING_GOVERNANCE.excel.uploadingLabel
                : GH_PRICING_GOVERNANCE.excel.dropzoneLabel}
            </Button>
            <input
              ref={fileInputRef}
              type='file'
              accept='.xlsx'
              hidden
              onChange={event => {
                const file = event.target.files?.[0]

                if (file) void handleFile(file)
                event.target.value = ''
              }}
            />

            {error ? <Alert severity='error'>{error}</Alert> : null}

            {uploading ? (
              <Stack direction='row' spacing={1} alignItems='center'>
                <CircularProgress size={16} />
                <Typography variant='caption'>{GH_PRICING_GOVERNANCE.excel.uploadingLabel}</Typography>
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {preview ? (
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={GH_PRICING_GOVERNANCE.excel.diffSectionTitle}
          subheader={`${GH_PRICING_GOVERNANCE.excel.diffSummaryProcessedLabel(diffSummary.processed)} · ${GH_PRICING_GOVERNANCE.excel.diffSummaryApplicableLabel(diffSummary.applicableNow)}`}
          action={
              <Stack direction='row' spacing={1.5}>
                <Button
                  variant='outlined'
                  color='warning'
                  onClick={() => void handleProposeApproval()}
                  disabled={proposing || diffSummary.selectedForApproval === 0}
                  startIcon={proposing ? <CircularProgress size={16} color='inherit' /> : null}
                >
                  {proposing
                    ? GH_PRICING_GOVERNANCE.excel.proposingLabel
                    : GH_PRICING_GOVERNANCE.excel.proposeApprovalCta}
                </Button>
                <Button
                  variant='contained'
                  color='primary'
                  onClick={() => void handleApply()}
                  disabled={applying || diffSummary.selectedApplicable === 0}
                  startIcon={applying ? <CircularProgress size={16} color='inherit' /> : null}
                >
                  {applying
                    ? GH_PRICING_GOVERNANCE.excel.applyingLabel
                    : GH_PRICING_GOVERNANCE.excel.applySelectedCta}
                </Button>
              </Stack>
            }
          />
          <Divider />
          <CardContent>
            <Stack spacing={2.5}>
              <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
                <CustomChip
                  size='small'
                  round='true'
                  variant='tonal'
                  color='info'
                  label={GH_PRICING_GOVERNANCE.excel.diffSummaryApplicableLabel(diffSummary.selectedApplicable)}
                />
                {diffSummary.selectedForApproval > 0 ? (
                  <CustomChip
                    size='small'
                    round='true'
                    variant='tonal'
                    color='warning'
                    label={GH_PRICING_GOVERNANCE.excel.diffSummaryProposalLabel(diffSummary.selectedForApproval)}
                  />
                ) : null}
                {diffSummary.followupCount > 0 ? (
                  <CustomChip
                    size='small'
                    round='true'
                    variant='tonal'
                    color='warning'
                    label={GH_PRICING_GOVERNANCE.excel.diffSummaryNeedsFollowupLabel(
                      diffSummary.followupCount
                    )}
                  />
                ) : null}
                {diffSummary.noopCount > 0 ? (
                  <CustomChip
                    size='small'
                    round='true'
                    variant='tonal'
                    color='secondary'
                    label={`${diffSummary.noopCount} sin cambios`}
                  />
                ) : null}
              </Stack>

              <Alert severity='info'>
                <Typography variant='subtitle2' sx={{ mb: 0.5 }}>
                  {GH_PRICING_GOVERNANCE.excel.updatesOnlyBannerTitle}
                </Typography>
                <Typography variant='body2'>
                  {GH_PRICING_GOVERNANCE.excel.updatesOnlyBannerBody(diffSummary.selectedForApproval)}
                </Typography>
              </Alert>

              {diffSummary.followupCount > 0 ? (
                <Alert
                  severity='warning'
                  action={
                    <Button
                      component={Link}
                      href='/admin/pricing-catalog/approvals'
                      color='inherit'
                      size='small'
                    >
                      {GH_PRICING_GOVERNANCE.excel.approvalQueueCta}
                    </Button>
                  }
                >
                  <Typography variant='subtitle2' sx={{ mb: 0.5 }}>
                    {GH_PRICING_GOVERNANCE.excel.approvalFollowupTitle}
                  </Typography>
                  <Typography variant='body2'>
                    {GH_PRICING_GOVERNANCE.excel.approvalFollowupBody(
                      diffSummary.createCount,
                      diffSummary.deleteCount
                    )}
                  </Typography>
                </Alert>
              ) : null}

              {preview.diffs.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                  {GH_PRICING_GOVERNANCE.excel.noDiffsLabel}
                </Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell padding='checkbox' />
                        <TableCell>Acción</TableCell>
                        <TableCell>Entity ID</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell>Campos modificados</TableCell>
                        <TableCell>Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.diffs.map(diff => {
                        const diffStatus = getDiffStatus(diff)

                        return (
                          <TableRow key={diff.entityId ?? `${diff.entitySku}-${diff.action}`} hover>
                            <TableCell padding='checkbox'>
                              <Checkbox
                                size='small'
                                checked={Boolean(diff.entityId && selected.has(diff.entityId))}
                                disabled={!diffStatus.selectable}
                                onChange={() => toggleDiff(diff.entityId)}
                              />
                            </TableCell>
                            <TableCell>
                              <CustomChip
                                size='small'
                                round='true'
                                variant='tonal'
                                color={ACTION_COLOR[diff.action]}
                                label={ACTION_LABEL[diff.action]}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              {diff.entityId ?? '—'}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>
                              {diff.entitySku ?? '—'}
                            </TableCell>
                            <TableCell>
                              <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                                {diff.fieldsChanged.slice(0, 5).join(', ')}
                                {diff.fieldsChanged.length > 5 ? ` +${diff.fieldsChanged.length - 5}` : ''}
                              </Typography>
                              {diff.warnings.map((warning, idx) => (
                                <Typography
                                  key={`${diff.entityId ?? diff.entitySku ?? idx}-warning-${idx}`}
                                  variant='caption'
                                  color='warning.main'
                                  sx={{ display: 'block', mt: 0.5 }}
                                >
                                  {warning}
                                </Typography>
                              ))}
                            </TableCell>
                            <TableCell>
                              <CustomChip
                                size='small'
                                round='true'
                                variant='tonal'
                                color={diffStatus.severity}
                                label={diffStatus.label}
                              />
                              <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ display: 'block', mt: 0.75, maxWidth: 220 }}
                              >
                                {diffStatus.helper}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {applyResult ? (
                <Box sx={{ mt: 2 }}>
                  <Alert severity={applyResult.failed > 0 ? 'warning' : 'success'}>
                    {applyResult.failed > 0
                      ? GH_PRICING_GOVERNANCE.excel.applyPartialToast(
                          applyResult.applied,
                          applyResult.failed
                        )
                      : GH_PRICING_GOVERNANCE.excel.applySuccessToast(applyResult.applied)}
                  </Alert>
                </Box>
              ) : null}

              {proposalResult ? (
                <Box sx={{ mt: 2 }}>
                  <Alert
                    severity='success'
                    action={
                      <Button component={Link} href='/admin/pricing-catalog/approvals' color='inherit' size='small'>
                        {GH_PRICING_GOVERNANCE.excel.approvalQueueCta}
                      </Button>
                    }
                  >
                    {GH_PRICING_GOVERNANCE.excel.proposeSuccessToast(proposalResult.proposed)}
                  </Alert>
                </Box>
              ) : null}

              {preview.metadata.errors.length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant='caption' color='error.main' sx={{ fontWeight: 600 }}>
                    Errores de parseo:
                  </Typography>
                  {preview.metadata.errors.map((err, idx) => (
                    <Typography key={idx} variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                      {err.sheet} fila {err.row}: {err.message}
                    </Typography>
                  ))}
                </Box>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  )
}

export default ExcelImportView
