'use client'

import { useCallback, useRef, useState } from 'react'

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

import { GH_PRICING_GOVERNANCE } from '@/config/greenhouse-nomenclature'

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
  const [applyResult, setApplyResult] = useState<{ applied: number; failed: number } | null>(null)

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

      // Preselect updates (skip noop by default).
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
    const diffsToApply = preview.diffs.filter(d => d.entityId && selected.has(d.entityId))

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
            subheader={`${preview.metadata.rolesProcessed} filas procesadas`}
            action={
              <Button
                variant='contained'
                color='primary'
                onClick={() => void handleApply()}
                disabled={applying || selected.size === 0}
                startIcon={applying ? <CircularProgress size={16} color='inherit' /> : null}
              >
                {applying
                  ? GH_PRICING_GOVERNANCE.excel.applyingLabel
                  : GH_PRICING_GOVERNANCE.excel.applySelectedCta}
              </Button>
            }
          />
          <Divider />
          <CardContent>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.diffs.map(diff => (
                      <TableRow key={diff.entityId ?? `${diff.entitySku}-${diff.action}`} hover>
                        <TableCell padding='checkbox'>
                          <Checkbox
                            size='small'
                            checked={Boolean(diff.entityId && selected.has(diff.entityId))}
                            disabled={!diff.entityId || diff.action === 'noop'}
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
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {diff.entityId ?? '—'}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {diff.entitySku ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Typography variant='caption' color='text.secondary'>
                            {diff.fieldsChanged.slice(0, 5).join(', ')}
                            {diff.fieldsChanged.length > 5 ? ` +${diff.fieldsChanged.length - 5}` : ''}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {applyResult ? (
              <Box sx={{ mt: 2 }}>
                <Alert severity={applyResult.failed > 0 ? 'warning' : 'success'}>
                  {applyResult.failed > 0
                    ? GH_PRICING_GOVERNANCE.excel.applyPartialToast(applyResult.applied, applyResult.failed)
                    : GH_PRICING_GOVERNANCE.excel.applySuccessToast(applyResult.applied)}
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
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  )
}

export default ExcelImportView
