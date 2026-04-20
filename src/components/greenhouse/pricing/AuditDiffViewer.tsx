'use client'

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_PRICING_GOVERNANCE } from '@/config/greenhouse-nomenclature'

type AuditAction =
  | 'created'
  | 'updated'
  | 'deactivated'
  | 'reactivated'
  | 'cost_updated'
  | 'pricing_updated'
  | 'bulk_imported'
  | 'bulk_edited'
  | 'recipe_updated'
  | 'deleted'
  | 'reverted'
  | 'approval_applied'

export interface AuditDiffViewerProps {
  action: AuditAction | string
  changeSummary: Record<string, unknown> | null | undefined
}

interface ParsedChangeSummary {
  previousValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  fieldsChanged: string[]
  metadata: Record<string, unknown>
}

const pickRecord = (obj: Record<string, unknown>, key: string): Record<string, unknown> | null => {
  const value = obj[key]

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

const pickStringArray = (obj: Record<string, unknown>, key: string): string[] => {
  const value = obj[key]

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  return []
}

const parseChangeSummary = (raw: AuditDiffViewerProps['changeSummary']): ParsedChangeSummary => {
  if (!raw || typeof raw !== 'object') {
    return { previousValues: null, newValues: null, fieldsChanged: [], metadata: {} }
  }

  const previousValues = pickRecord(raw, 'previous_values') ?? pickRecord(raw, 'previousValues')
  const newValues = pickRecord(raw, 'new_values') ?? pickRecord(raw, 'newValues')

  const fieldsChanged =
    pickStringArray(raw, 'fields_changed').length > 0
      ? pickStringArray(raw, 'fields_changed')
      : pickStringArray(raw, 'fieldsChanged')

  const metadata: Record<string, unknown> = { ...raw }

  delete metadata.previous_values
  delete metadata.previousValues
  delete metadata.new_values
  delete metadata.newValues
  delete metadata.fields_changed
  delete metadata.fieldsChanged

  return { previousValues, newValues, fieldsChanged, metadata }
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return GH_PRICING_GOVERNANCE.auditDiff.noValueLabel
  }

  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'

    return JSON.stringify(value)
  }

  return JSON.stringify(value, null, 2)
}

const computeNumberDelta = (previous: unknown, next: unknown): string | null => {
  if (typeof previous !== 'number' || typeof next !== 'number') return null
  if (!Number.isFinite(previous) || !Number.isFinite(next)) return null

  const absolute = next - previous

  if (absolute === 0) return GH_PRICING_GOVERNANCE.auditDiff.deltaZero

  const absoluteStr = Math.abs(absolute).toFixed(Math.abs(absolute) % 1 === 0 ? 0 : 2)
  const pctStr =
    previous === 0 ? '∞' : (((next - previous) / Math.abs(previous)) * 100).toFixed(2).replace(/\.?0+$/, '')

  if (absolute > 0) {
    return GH_PRICING_GOVERNANCE.auditDiff.deltaAbove(absoluteStr, pctStr)
  }

  return GH_PRICING_GOVERNANCE.auditDiff.deltaBelow(`-${absoluteStr}`, `-${pctStr}`)
}

const computeArrayDiff = (previous: unknown, next: unknown) => {
  const previousSet = new Set(Array.isArray(previous) ? previous.map(v => JSON.stringify(v)) : [])
  const nextSet = new Set(Array.isArray(next) ? next.map(v => JSON.stringify(v)) : [])
  const added: string[] = []
  const removed: string[] = []

  for (const v of nextSet) {
    if (!previousSet.has(v)) added.push(v)
  }

  for (const v of previousSet) {
    if (!nextSet.has(v)) removed.push(v)
  }

  return { added, removed }
}

const isEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (a === null || b === null || a === undefined || b === undefined) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  return false
}

interface StateBannerMeta {
  title: string
  subtitle?: string
  severity: 'info' | 'success' | 'warning'
}

const resolveStateBanner = (action: AuditAction | string): StateBannerMeta | null => {
  switch (action) {
    case 'created':
      return {
        title: GH_PRICING_GOVERNANCE.auditDiff.createdStateTitle,
        subtitle: GH_PRICING_GOVERNANCE.auditDiff.createdStateSubtitle,
        severity: 'success'
      }
    case 'deactivated':
      return {
        title: GH_PRICING_GOVERNANCE.auditDiff.deactivatedStateTitle,
        subtitle: GH_PRICING_GOVERNANCE.auditDiff.deactivatedStateSubtitle,
        severity: 'warning'
      }
    case 'reactivated':
      return { title: GH_PRICING_GOVERNANCE.auditDiff.reactivatedStateTitle, severity: 'success' }
    case 'deleted':
      return {
        title: GH_PRICING_GOVERNANCE.auditDiff.deletedStateTitle,
        subtitle: GH_PRICING_GOVERNANCE.auditDiff.deletedStateSubtitle,
        severity: 'warning'
      }
    case 'bulk_imported':
      return {
        title: GH_PRICING_GOVERNANCE.auditDiff.bulkImportedStateTitle,
        subtitle: GH_PRICING_GOVERNANCE.auditDiff.bulkImportedStateSubtitle,
        severity: 'info'
      }
    case 'bulk_edited':
      return {
        title: GH_PRICING_GOVERNANCE.auditDiff.bulkEditedStateTitle,
        subtitle: GH_PRICING_GOVERNANCE.auditDiff.bulkEditedStateSubtitle,
        severity: 'info'
      }
    case 'recipe_updated':
      return { title: GH_PRICING_GOVERNANCE.auditDiff.recipeUpdatedStateTitle, severity: 'info' }
    case 'cost_updated':
      return { title: GH_PRICING_GOVERNANCE.auditDiff.costUpdatedStateTitle, severity: 'info' }
    case 'pricing_updated':
      return { title: GH_PRICING_GOVERNANCE.auditDiff.pricingUpdatedStateTitle, severity: 'info' }
    case 'reverted':
      return {
        title: GH_PRICING_GOVERNANCE.auditDiff.revertedStateTitle,
        subtitle: GH_PRICING_GOVERNANCE.auditDiff.revertedStateSubtitle,
        severity: 'warning'
      }
    case 'approval_applied':
      return {
        title: GH_PRICING_GOVERNANCE.auditDiff.approvalAppliedStateTitle,
        subtitle: GH_PRICING_GOVERNANCE.auditDiff.approvalAppliedStateSubtitle,
        severity: 'success'
      }
    case 'updated':
    default:
      return null
  }
}

/**
 * AuditDiffViewer — primitive reusable que reemplaza `<pre>{JSON.stringify(changeSummary)}</pre>`
 * en el audit timeline del pricing catalog (TASK-471 slice 1).
 *
 * Contrato:
 *   - changeSummary JSONB shape: `{ previous_values, new_values, fields_changed, ...metadata }`
 *   - Soporta camelCase y snake_case (backward compat con audit rows históricos).
 *   - Render por action:
 *       created / bulk_imported → solo new_values
 *       deactivated / deleted   → previous_values con banner de contexto
 *       updated / cost_updated / pricing_updated / reactivated / reverted / approval_applied / bulk_edited →
 *         side-by-side "Antes" vs "Después" con fields_changed highlighted
 *       recipe_updated → side-by-side si hay previous+new, sino solo new_values
 *   - Numéricos: delta absoluto + pct (redondeado a 2 decimales, trailing zeros stripped).
 *   - Arrays: set diff (items agregados/quitados).
 *   - Objetos anidados: JSON.stringify inline (tree view completo sería overkill en V1).
 *   - Botón "Copiar JSON" para debugging.
 *
 * Reutilizable por el confirm dialog del revert (slice 2) y por el preview del import Excel (slice 6).
 */
const AuditDiffViewer = ({ action, changeSummary }: AuditDiffViewerProps) => {
  const [expandUnchanged, setExpandUnchanged] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const parsed = useMemo(() => parseChangeSummary(changeSummary), [changeSummary])
  const banner = resolveStateBanner(action)

  const allKeys = useMemo(() => {
    const keys = new Set<string>()

    parsed.fieldsChanged.forEach(k => keys.add(k))
    if (parsed.previousValues) Object.keys(parsed.previousValues).forEach(k => keys.add(k))
    if (parsed.newValues) Object.keys(parsed.newValues).forEach(k => keys.add(k))

    return Array.from(keys)
  }, [parsed])

  const changedKeys = useMemo(() => {
    if (parsed.fieldsChanged.length > 0) return new Set(parsed.fieldsChanged)

    const computed = new Set<string>()

    for (const key of allKeys) {
      const prev = parsed.previousValues?.[key]
      const next = parsed.newValues?.[key]

      if (!isEqual(prev, next)) computed.add(key)
    }

    return computed
  }, [allKeys, parsed])

  const unchangedKeys = useMemo(() => allKeys.filter(k => !changedKeys.has(k)), [allKeys, changedKeys])

  const showSideBySide = Boolean(parsed.previousValues) && Boolean(parsed.newValues)
  const showOnlyNew =
    !showSideBySide && Boolean(parsed.newValues) && (action === 'created' || action === 'bulk_imported')
  const showOnlyPrevious =
    !showSideBySide && Boolean(parsed.previousValues) && (action === 'deactivated' || action === 'deleted')

  const handleCopy = async () => {
    try {
      const text = JSON.stringify(changeSummary, null, 2)

      await navigator.clipboard.writeText(text)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1500)
    } catch {
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 1500)
    }
  }

  const hasAnyContent = parsed.previousValues || parsed.newValues || parsed.fieldsChanged.length > 0

  if (!hasAnyContent && !banner) {
    return (
      <Alert severity='info' variant='outlined'>
        <Typography variant='caption'>
          {GH_PRICING_GOVERNANCE.auditDiff.noChangesLabel}
        </Typography>
      </Alert>
    )
  }

  return (
    <Stack spacing={1.5}>
      {banner ? (
        <Alert severity={banner.severity} variant='outlined'>
          <Typography variant='caption' sx={{ fontWeight: 600, display: 'block' }}>
            {banner.title}
          </Typography>
          {banner.subtitle ? (
            <Typography variant='caption' color='text.secondary'>
              {banner.subtitle}
            </Typography>
          ) : null}
        </Alert>
      ) : null}

      {showSideBySide ? (
        <Box>
          <Stack direction='row' spacing={1} sx={{ mb: 1 }}>
            <Typography variant='caption' sx={{ fontWeight: 600 }}>
              {GH_PRICING_GOVERNANCE.auditDiff.changedFieldsSummary(changedKeys.size)}
            </Typography>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <Box>
              <Typography
                variant='caption'
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'text.secondary',
                  display: 'block',
                  mb: 0.5
                }}
              >
                {GH_PRICING_GOVERNANCE.auditDiff.previousColumnLabel}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant='caption'
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'text.secondary',
                  display: 'block',
                  mb: 0.5
                }}
              >
                {GH_PRICING_GOVERNANCE.auditDiff.newColumnLabel}
              </Typography>
            </Box>
          </Box>

          <Stack spacing={0.5}>
            {Array.from(changedKeys).map(key => {
              const previous = parsed.previousValues?.[key]
              const next = parsed.newValues?.[key]
              const numberDelta = computeNumberDelta(previous, next)
              const arrayDiff =
                Array.isArray(previous) || Array.isArray(next)
                  ? computeArrayDiff(previous, next)
                  : null

              return (
                <Box
                  key={key}
                  sx={theme => ({
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 1,
                    p: 1,
                    borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                    border: `1px solid ${theme.palette.divider}`
                  })}
                >
                  <Box
                    sx={theme => ({
                      backgroundColor: alpha(theme.palette.error.main, 0.08),
                      borderRadius: `${theme.shape.customBorderRadius.xs}px`,
                      p: 1
                    })}
                  >
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600, display: 'block', color: 'error.main' }}
                    >
                      {key}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}
                    >
                      {formatValue(previous)}
                    </Typography>
                    {arrayDiff && arrayDiff.removed.length > 0 ? (
                      <Typography variant='caption' color='error.main' sx={{ display: 'block', mt: 0.5 }}>
                        {GH_PRICING_GOVERNANCE.auditDiff.removedMarker}: {arrayDiff.removed.join(', ')}
                      </Typography>
                    ) : null}
                  </Box>
                  <Box
                    sx={theme => ({
                      backgroundColor: alpha(theme.palette.success.main, 0.08),
                      borderRadius: `${theme.shape.customBorderRadius.xs}px`,
                      p: 1
                    })}
                  >
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600, display: 'block', color: 'success.main' }}
                    >
                      {key}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}
                    >
                      {formatValue(next)}
                    </Typography>
                    {numberDelta ? (
                      <Typography variant='caption' color='success.main' sx={{ display: 'block', mt: 0.5 }}>
                        {numberDelta}
                      </Typography>
                    ) : null}
                    {arrayDiff && arrayDiff.added.length > 0 ? (
                      <Typography variant='caption' color='success.main' sx={{ display: 'block', mt: 0.5 }}>
                        {GH_PRICING_GOVERNANCE.auditDiff.addedMarker}: {arrayDiff.added.join(', ')}
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              )
            })}
          </Stack>
        </Box>
      ) : null}

      {showOnlyNew && parsed.newValues ? (
        <Box sx={theme => ({ p: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: `${theme.shape.customBorderRadius.sm}px` })}>
          {Object.entries(parsed.newValues).map(([key, value]) => (
            <Box key={key} sx={{ mb: 0.5 }}>
              <Typography variant='caption' sx={{ fontWeight: 600, display: 'inline-block', minWidth: 160 }}>
                {key}:
              </Typography>{' '}
              <Typography variant='caption' sx={{ fontFamily: 'monospace' }}>
                {formatValue(value)}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : null}

      {showOnlyPrevious && parsed.previousValues ? (
        <Box sx={theme => ({ p: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: `${theme.shape.customBorderRadius.sm}px` })}>
          {Object.entries(parsed.previousValues).map(([key, value]) => (
            <Box key={key} sx={{ mb: 0.5 }}>
              <Typography variant='caption' sx={{ fontWeight: 600, display: 'inline-block', minWidth: 160 }}>
                {key}:
              </Typography>{' '}
              <Typography variant='caption' sx={{ fontFamily: 'monospace' }}>
                {formatValue(value)}
              </Typography>
            </Box>
          ))}
        </Box>
      ) : null}

      {showSideBySide && unchangedKeys.length > 0 ? (
        <Box>
          <Button
            size='small'
            variant='text'
            onClick={() => setExpandUnchanged(prev => !prev)}
            startIcon={
              <i
                className={expandUnchanged ? 'tabler-chevron-up' : 'tabler-chevron-down'}
                style={{ fontSize: 14 }}
              />
            }
          >
            {GH_PRICING_GOVERNANCE.auditDiff.unchangedFieldsSummary(unchangedKeys.length)}
          </Button>
          <Collapse in={expandUnchanged}>
            <Box sx={{ mt: 1 }}>
              {unchangedKeys.map(key => {
                const value = parsed.newValues?.[key] ?? parsed.previousValues?.[key]

                return (
                  <Box key={key} sx={{ mb: 0.5 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'inline-block', minWidth: 160 }}>
                      {key}:
                    </Typography>{' '}
                    <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                      {formatValue(value)}
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          </Collapse>
        </Box>
      ) : null}

      {Object.keys(parsed.metadata).length > 0 ? (
        <>
          <Divider />
          <Box>
            {Object.entries(parsed.metadata).map(([key, value]) => (
              <Box key={key}>
                <Typography variant='caption' sx={{ fontWeight: 600 }}>
                  {key}:
                </Typography>{' '}
                <Typography variant='caption' sx={{ fontFamily: 'monospace' }} color='text.secondary'>
                  {formatValue(value)}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      ) : null}

      <Stack direction='row' justifyContent='flex-end'>
        <Tooltip
          title={
            copyState === 'copied'
              ? GH_PRICING_GOVERNANCE.auditDiff.copiedLabel
              : copyState === 'error'
                ? GH_PRICING_GOVERNANCE.auditDiff.copyFailedLabel
                : GH_PRICING_GOVERNANCE.auditDiff.copyJsonLabel
          }
        >
          <IconButton size='small' onClick={handleCopy} aria-label={GH_PRICING_GOVERNANCE.auditDiff.copyJsonLabel}>
            <i className='tabler-clipboard-copy' style={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  )
}

export default AuditDiffViewer
