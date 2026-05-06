'use client'

import { useCallback, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { GH_PRICING_GOVERNANCE } from '@/lib/copy/pricing'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()


export interface BulkEditDrawerProps {
  open: boolean

  /** @deprecated use entityIds + entityType */
  roleIds?: string[]
  entityType?: 'sellable_role' | 'tool_catalog' | 'overhead_addon' | 'service_catalog'
  entityIds?: string[]
  onClose: () => void
  onSuccess: (result: { applied: number; failed: number }) => void
}

const BulkEditDrawer = ({
  open,
  roleIds,
  entityType: entityTypeProp,
  entityIds: entityIdsProp,
  onClose,
  onSuccess
}: BulkEditDrawerProps) => {
  const entityType = entityTypeProp ?? 'sellable_role'
  const entityIds = useMemo(() => entityIdsProp ?? roleIds ?? [], [entityIdsProp, roleIds])

  const [active, setActive] = useState<'unchanged' | 'activate' | 'deactivate'>('unchanged')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    if (submitting) return
    setActive('unchanged')
    setNotes('')
    setError(null)
    onClose()
  }, [onClose, submitting])

  const handleSubmit = useCallback(async () => {
    const updates: Record<string, unknown> = {}

    if (active === 'activate') {
      // tool_catalog usa is_active, otros active
      if (entityType === 'tool_catalog') updates.is_active = true
      else updates.active = true
    }

    if (active === 'deactivate') {
      if (entityType === 'tool_catalog') updates.is_active = false
      else updates.active = false
    }

    const notesAppend = notes.trim()

    if (Object.keys(updates).length === 0 && !notesAppend) {
      setError(GH_PRICING_GOVERNANCE.bulkEdit.emptyChangesetError)

      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/pricing-catalog/bulk', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityIds,
          updates,
          notesAppend: notesAppend || undefined
        })
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }

        setError(payload.error || GH_PRICING_GOVERNANCE.bulkEdit.errorToast)

        return
      }

      const data = (await response.json()) as { applied: number; failed: number }

      onSuccess(data)
      handleClose()
    } catch {
      setError(GH_PRICING_GOVERNANCE.bulkEdit.errorToast)
    } finally {
      setSubmitting(false)
    }
  }, [active, entityIds, entityType, handleClose, notes, onSuccess])

  return (
    <Drawer anchor='right' open={open} onClose={handleClose} PaperProps={{ sx: { width: 480 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
        <Stack spacing={0.25}>
          <Typography variant='h6' sx={{ fontWeight: 700 }}>
            {GH_PRICING_GOVERNANCE.bulkEdit.drawerTitle}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {GH_PRICING_GOVERNANCE.bulkEdit.drawerSubtitle(entityIds.length)}
          </Typography>
        </Stack>
        <IconButton onClick={handleClose} size='small' disabled={submitting} aria-label={GREENHOUSE_COPY.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </Box>
      <Divider />

      <Stack spacing={3} sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
        <Box>
          <Typography variant='caption' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', display: 'block', mb: 1 }}>
            {GH_PRICING_GOVERNANCE.bulkEdit.activeFieldLabel}
          </Typography>
          <Stack direction='row' spacing={2}>
            <FormControlLabel
              control={<Switch checked={active === 'activate'} onChange={(_, c) => setActive(c ? 'activate' : 'unchanged')} />}
              label='Activar'
            />
            <FormControlLabel
              control={<Switch checked={active === 'deactivate'} color='warning' onChange={(_, c) => setActive(c ? 'deactivate' : 'unchanged')} />}
              label='Desactivar'
            />
          </Stack>
        </Box>

        <TextField
          label={GH_PRICING_GOVERNANCE.bulkEdit.notesFieldLabel}
          placeholder={GH_PRICING_GOVERNANCE.bulkEdit.notesFieldPlaceholder}
          value={notes}
          onChange={e => setNotes(e.target.value.slice(0, 500))}
          multiline
          minRows={2}
          maxRows={4}
          size='small'
          fullWidth
          disabled={submitting}
        />

        {error ? <Alert severity='error'>{error}</Alert> : null}
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 3 }}>
        <Button variant='outlined' onClick={handleClose} fullWidth disabled={submitting}>
          {GH_PRICING_GOVERNANCE.bulkEdit.cancelCta}
        </Button>
        <Button
          variant='contained'
          onClick={() => void handleSubmit()}
          fullWidth
          disabled={submitting || entityIds.length === 0}
          startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : null}
        >
          {submitting
            ? GH_PRICING_GOVERNANCE.bulkEdit.applyingCtaLabel
            : GH_PRICING_GOVERNANCE.bulkEdit.applyCtaLabel}
        </Button>
      </Box>
    </Drawer>
  )
}

export default BulkEditDrawer
