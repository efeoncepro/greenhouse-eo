'use client'

import { useCallback, useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

import { getMicrocopy } from '@/lib/copy'

import type { BusinessLineMetadata } from '@/types/business-line'

const GREENHOUSE_COPY = getMicrocopy()

type Props = {
  open: boolean
  metadata: BusinessLineMetadata | null
  onClose: () => void
  onSaved: (updated: BusinessLineMetadata) => void
}

const BusinessLineEditDialog = ({ open, metadata, onClose, onSaved }: Props) => {
  const [label, setLabel] = useState('')
  const [labelFull, setLabelFull] = useState('')
  const [claim, setClaim] = useState('')
  const [leadName, setLeadName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (metadata) {
      setLabel(metadata.label)
      setLabelFull(metadata.labelFull || '')
      setClaim(metadata.claim || '')
      setLeadName(metadata.leadName || '')
      setDescription(metadata.description || '')
    }
  }, [metadata])

  const handleSave = useCallback(async () => {
    if (!metadata) return

    setSaving(true)

    try {
      const res = await fetch(`/api/admin/business-lines/${metadata.moduleCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          labelFull: labelFull.trim() || null,
          claim: claim.trim() || null,
          leadName: leadName.trim() || null,
          description: description.trim() || null
        })
      })

      if (res.ok) {
        const updated = (await res.json()) as BusinessLineMetadata

        onSaved(updated)
      }
    } finally {
      setSaving(false)
    }
  }, [metadata, label, labelFull, claim, leadName, description, onSaved])

  if (!metadata) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Editar {metadata.label}
        <span style={{ fontSize: 12, marginLeft: 8, opacity: 0.5 }}>{metadata.moduleCode}</span>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            label='Label'
            value={label}
            onChange={e => setLabel(e.target.value)}
            size='small'
            fullWidth
            required
          />
          <TextField
            label='Label completo'
            value={labelFull}
            onChange={e => setLabelFull(e.target.value)}
            size='small'
            fullWidth
            placeholder='Globe — Creative & Content'
          />
          <TextField
            label='Claim'
            value={claim}
            onChange={e => setClaim(e.target.value)}
            size='small'
            fullWidth
            placeholder='Empower your Brand'
          />
          <TextField
            label='Lead (nombre)'
            value={leadName}
            onChange={e => setLeadName(e.target.value)}
            size='small'
            fullWidth
          />
          <TextField
            label='Descripcion'
            value={description}
            onChange={e => setDescription(e.target.value)}
            size='small'
            fullWidth
            multiline
            rows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color='secondary' disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button
          variant='contained'
          onClick={handleSave}
          disabled={saving || !label.trim()}
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
        >{GREENHOUSE_COPY.actions.save}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default BusinessLineEditDialog
