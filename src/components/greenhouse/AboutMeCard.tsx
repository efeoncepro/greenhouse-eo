'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import { GH_SKILLS_CERTS } from '@/lib/copy/workforce'

const TASK407_ARIA_EDITAR_BIOGRAFIA = "Editar biografía"


const GREENHOUSE_COPY = getMicrocopy()

const MAX_CHARS = 500

type AboutMeCardProps = {
  value: string | null
  editable: boolean
  onSave?: (value: string) => Promise<void>
}

const AboutMeCard = ({ value, editable, onSave }: AboutMeCardProps) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEdit = () => {
    setDraft(value ?? '')
    setEditing(true)
    setError(null)
  }

  const handleCancel = () => {
    setEditing(false)
    setError(null)
  }

  const handleSave = async () => {
    if (!onSave) return

    setSaving(true)
    setError(null)

    try {
      await onSave(draft.trim())
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={GH_SKILLS_CERTS.section_about_me}
          action={
            <Stack direction='row' spacing={1}>
              <Button size='small' onClick={handleCancel} disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
              <Button size='small' variant='contained' onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </Stack>
          }
        />
        <CardContent>
          <Stack spacing={1}>
            <TextField
              multiline
              rows={4}
              value={draft}
              onChange={e => {
                if (e.target.value.length <= MAX_CHARS) {
                  setDraft(e.target.value)
                }
              }}
              placeholder={GH_SKILLS_CERTS.about_me_placeholder}
              fullWidth
              disabled={saving}
              slotProps={{
                htmlInput: { maxLength: MAX_CHARS }
              }}
            />
            <Typography variant='caption' color='text.secondary' textAlign='right'>
              {draft.length} / {MAX_CHARS}
            </Typography>
            {error && <Alert severity='error'>{error}</Alert>}
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title={GH_SKILLS_CERTS.section_about_me}
        action={
          editable ? (
            <IconButton size='small' onClick={handleEdit} aria-label={TASK407_ARIA_EDITAR_BIOGRAFIA}>
              <i className='tabler-pencil' />
            </IconButton>
          ) : undefined
        }
      />
      <CardContent>
        {value ? (
          <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
            {value}
          </Typography>
        ) : (
          <Stack alignItems='center' spacing={1} sx={{ py: 3 }}>
            <i className='tabler-user-circle text-[24px]' style={{ opacity: 0.4 }} />
            <Typography variant='body2' color='text.secondary' textAlign='center'>
              {GH_SKILLS_CERTS.empty_about_me}
            </Typography>
            {editable && (
              <Button size='small' variant='tonal' onClick={handleEdit} sx={{ mt: 1 }}>
                Escribir biografía
              </Button>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

export default AboutMeCard
