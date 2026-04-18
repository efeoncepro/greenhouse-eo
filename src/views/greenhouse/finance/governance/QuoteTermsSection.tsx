'use client'

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

export interface QuotationTerm {
  quotationTermId: string
  quotationId: string
  termId: string
  termCode: string | null
  title: string | null
  category: string | null
  bodyResolved: string
  sortOrder: number
  included: boolean
  required: boolean
  createdAt: string
  updatedAt: string
}

interface Props {
  loading: boolean
  error: string | null
  terms: QuotationTerm[]
  canEdit: boolean
  saving: boolean
  onSave: (terms: Array<{ termId: string; included: boolean; sortOrder: number }>) => Promise<void>
}

const CATEGORY_CHIP: Record<string, { label: string; color: 'info' | 'warning' | 'secondary' | 'primary' | 'success' }> = {
  payment: { label: 'Pagos', color: 'info' },
  delivery: { label: 'Entrega', color: 'primary' },
  legal: { label: 'Legal', color: 'warning' },
  staffing: { label: 'Personas', color: 'success' },
  sla: { label: 'SLA', color: 'info' },
  general: { label: 'General', color: 'secondary' }
}

const QuoteTermsSection = ({ loading, error, terms, canEdit, saving, onSave }: Props) => {
  const [draft, setDraft] = useState<Record<string, boolean> | null>(null)

  const editableTerms = useMemo(() => terms.map(term => ({ ...term })), [terms])

  const toggleTerm = (termId: string, included: boolean) => {
    setDraft(prev => ({
      ...(prev ?? Object.fromEntries(editableTerms.map(t => [t.termId, t.included]))),
      [termId]: included
    }))
  }

  const handleSave = async () => {
    if (!draft) return

    const payload = editableTerms.map(term => ({
      termId: term.termId,
      included: term.required ? true : draft[term.termId] ?? term.included,
      sortOrder: term.sortOrder
    }))

    await onSave(payload)
    setDraft(null)
  }

  const dirty = draft !== null

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant='rounded' height={60} />
        <Skeleton variant='rounded' height={240} />
      </Stack>
    )
  }

  if (error) return <Alert severity='error'>{error}</Alert>

  if (terms.length === 0) {
    return (
      <Card variant='outlined'>
        <CardContent>
          <Typography variant='body2' color='text.secondary' align='center'>
            Esta cotización aún no tiene términos aplicados. Al abrir el detalle, se precargan los términos por defecto.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant='outlined'>
      <CardHeader
        title='Términos y condiciones'
        subheader={`${terms.filter(t => t.included).length} de ${terms.length} términos incluidos en el PDF`}
        action={
          canEdit && dirty ? (
            <Stack direction='row' spacing={1}>
              <Button size='small' onClick={() => setDraft(null)} disabled={saving}>
                Descartar
              </Button>
              <Button
                size='small'
                variant='contained'
                startIcon={<i className='tabler-device-floppy' />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </Stack>
          ) : null
        }
      />
      <Divider />
      <CardContent>
        <Stack spacing={2} divider={<Divider flexItem />}>
          {editableTerms.map(term => {
            const chip = term.category ? CATEGORY_CHIP[term.category] : null
            const included = term.required ? true : draft?.[term.termId] ?? term.included

            return (
              <Box key={term.quotationTermId}>
                <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                  {chip && (
                    <Chip size='small' color={chip.color} variant='outlined' label={chip.label} />
                  )}
                  <Typography variant='subtitle2'>{term.title ?? term.termCode}</Typography>
                  {term.required && <Chip size='small' label='Obligatorio' color='primary' />}
                </Stack>
                <Typography
                  variant='body2'
                  color={included ? 'text.primary' : 'text.secondary'}
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  {term.bodyResolved}
                </Typography>
                {canEdit && !term.required && (
                  <FormControlLabel
                    sx={{ mt: 1 }}
                    control={
                      <Switch
                        size='small'
                        checked={included}
                        onChange={event => toggleTerm(term.termId, event.target.checked)}
                      />
                    }
                    label={included ? 'Incluir en el PDF' : 'Excluido del PDF'}
                  />
                )}
              </Box>
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default QuoteTermsSection
