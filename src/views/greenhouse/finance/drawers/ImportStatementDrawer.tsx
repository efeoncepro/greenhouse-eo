'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'

import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatementRowInput {
  transactionDate: string
  valueDate?: string
  description: string
  reference?: string
  amount: number
  balance?: number
}

type ImportMode = 'csv' | 'manual'

type Props = {
  open: boolean
  periodId: string
  onClose: () => void
  onSuccess: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BANK_FORMATS = [
  { value: 'bci', label: 'BCI' },
  { value: 'banco_estado', label: 'BancoEstado' },
  { value: 'santander', label: 'Santander' },
  { value: 'scotiabank', label: 'Scotiabank' },
  { value: 'generic', label: 'Generico (CSV)' }
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ImportStatementDrawer = ({ open, periodId, onClose, onSuccess }: Props) => {
  const [mode, setMode] = useState<ImportMode>('csv')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // CSV mode
  const [csvContent, setCsvContent] = useState('')
  const [bankFormat, setBankFormat] = useState('generic')

  // Manual mode
  const [manualRows, setManualRows] = useState<StatementRowInput[]>([
    { transactionDate: '', description: '', amount: 0 }
  ])

  const resetForm = () => {
    setCsvContent('')
    setBankFormat('generic')
    setManualRows([{ transactionDate: '', description: '', amount: 0 }])
    setError(null)
  }

  // ---------------------------------------------------------------------------
  // Manual row management
  // ---------------------------------------------------------------------------

  const updateManualRow = (index: number, field: keyof StatementRowInput, value: string | number) => {
    setManualRows(prev =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  const addManualRow = () => {
    setManualRows(prev => [...prev, { transactionDate: '', description: '', amount: 0 }])
  }

  const removeManualRow = (index: number) => {
    if (manualRows.length <= 1) return

    setManualRows(prev => prev.filter((_, i) => i !== index))
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = async () => {
    setError(null)

    let body: Record<string, unknown>

    if (mode === 'csv') {
      if (!csvContent.trim()) {
        setError('Pega el contenido del extracto CSV.')

        return
      }

      body = {
        csvContent: csvContent.trim(),
        bankFormat
      }
    } else {
      const validRows = manualRows.filter(r => r.transactionDate && r.description.trim() && Number(r.amount) !== 0)

      if (validRows.length === 0) {
        setError('Agrega al menos una fila con fecha, descripcion y monto distinto de cero.')

        return
      }

      const rows = validRows.map(r => ({
        transactionDate: r.transactionDate,
        description: r.description.trim(),
        amount: Number(r.amount) || 0,
        ...(r.reference?.trim() && { reference: r.reference.trim() }),
        ...(r.balance !== undefined && r.balance !== 0 && { balance: Number(r.balance) })
      }))

      body = { rows }
    }

    setSaving(true)

    try {
      const res = await fetch(`/api/finance/reconciliation/${periodId}/statements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al importar extracto.')
        setSaving(false)

        return
      }

      const data = await res.json()
      const importedCount = data.imported ?? 0

      toast.success(`Extracto importado: ${importedCount} fila${importedCount !== 1 ? 's' : ''}`)
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexion')
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Importar extracto bancario</Typography>
        <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        <TabContext value={mode}>
          <CustomTabList onChange={(_, v: ImportMode) => setMode(v)}>
            <Tab
              label='Pegar CSV'
              value='csv'
              icon={<i className='tabler-file-text' />}
              iconPosition='start'
            />
            <Tab
              label='Ingreso manual'
              value='manual'
              icon={<i className='tabler-edit' />}
              iconPosition='start'
            />
          </CustomTabList>

          {/* CSV Mode */}
          <TabPanel value='csv' sx={{ px: 0 }}>
            <Stack spacing={2}>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='Formato del banco'
                value={bankFormat}
                onChange={e => setBankFormat(e.target.value)}
              >
                {BANK_FORMATS.map(f => (
                  <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                ))}
              </CustomTextField>

              <CustomTextField
                fullWidth
                size='small'
                label='Contenido CSV'
                multiline
                rows={12}
                value={csvContent}
                onChange={e => setCsvContent(e.target.value)}
                placeholder={'Fecha,Descripcion,Referencia,Monto,Saldo\n2026-03-01,Transferencia cliente,...,4500000,17000000'}
                helperText='Pega el contenido del archivo CSV exportado desde tu banco'
              />

              {csvContent.trim() && (
                <Typography variant='caption' color='text.secondary'>
                  {csvContent.trim().split('\n').length} linea{csvContent.trim().split('\n').length !== 1 ? 's' : ''} detectada{csvContent.trim().split('\n').length !== 1 ? 's' : ''}
                </Typography>
              )}
            </Stack>
          </TabPanel>

          {/* Manual Mode */}
          <TabPanel value='manual' sx={{ px: 0 }}>
            <Stack spacing={2}>
              <Typography variant='body2' color='text.secondary'>
                Ingresa las filas del extracto manualmente. Minimo 1 fila.
              </Typography>

              {manualRows.map((row, index) => (
                <Box
                  key={index}
                  sx={{
                    border: t => `1px solid ${t.palette.divider}`,
                    borderRadius: 1,
                    p: 2,
                    position: 'relative'
                  }}
                >
                  {manualRows.length > 1 && (
                    <IconButton
                      size='small'
                      onClick={() => removeManualRow(index)}
                      sx={{ position: 'absolute', top: 4, right: 4 }}
                      aria-label={`Eliminar fila ${index + 1}`}
                    >
                      <i className='tabler-trash' style={{ fontSize: 16 }} />
                    </IconButton>
                  )}

                  <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
                    Fila {index + 1}
                  </Typography>

                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Fecha'
                        type='date'
                        value={row.transactionDate}
                        onChange={e => updateManualRow(index, 'transactionDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Monto'
                        type='number'
                        value={row.amount || ''}
                        onChange={e => updateManualRow(index, 'amount', Number(e.target.value))}
                        required
                        helperText='Negativo para cargos'
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Descripcion'
                        value={row.description}
                        onChange={e => updateManualRow(index, 'description', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Referencia'
                        value={row.reference || ''}
                        onChange={e => updateManualRow(index, 'reference', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Saldo'
                        type='number'
                        value={row.balance || ''}
                        onChange={e => updateManualRow(index, 'balance', Number(e.target.value))}
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}

              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='tabler-plus' />}
                onClick={addManualRow}
                sx={{ alignSelf: 'flex-start' }}
              >
                Agregar fila
              </Button>
            </Stack>
          </TabPanel>
        </TabContext>
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={onClose} fullWidth>
          Cancelar
        </Button>
        <Button
          variant='contained'
          color='primary'
          onClick={handleSubmit}
          disabled={saving}
          fullWidth
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-file-import' />}
        >
          {saving ? 'Importando...' : 'Importar extracto'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default ImportStatementDrawer
