'use client'

import { useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type { AiCreditLedgerResponse, AiToolingAdminMetadata } from '@/types/ai-tools'
import { ledgerEntryTypeConfig, formatTimestamp, formatCost } from '../helpers'

type Props = {
  meta: AiToolingAdminMetadata | null
}

const AiConsumptionTab = ({ meta }: Props) => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AiCreditLedgerResponse | null>(null)
  const [filterWallet, setFilterWallet] = useState('')
  const [filterMember, setFilterMember] = useState('')
  const [consumeOpen, setConsumeOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Consume form
  const [formWallet, setFormWallet] = useState('')
  const [formAmount, setFormAmount] = useState<number | ''>(1)
  const [formMember, setFormMember] = useState('')
  const [formAsset, setFormAsset] = useState('')
  const [formProject, setFormProject] = useState('')
  const [formTaskId, setFormTaskId] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const fetchLedger = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams()
    if (filterWallet) params.set('walletId', filterWallet)
    if (filterMember) params.set('memberId', filterMember)
    params.set('limit', '100')

    const res = await fetch(`/api/ai-credits/ledger?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [filterWallet, filterMember])

  useEffect(() => { fetchLedger() }, [fetchLedger])

  const handleConsume = async () => {
    setSaving(true)

    try {
      const requestId = `consume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      const res = await fetch('/api/ai-credits/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          walletId: formWallet,
          creditAmount: formAmount === '' ? 0 : formAmount,
          consumedByMemberId: formMember,
          assetDescription: formAsset,
          projectName: formProject || null,
          notionTaskId: formTaskId || null,
          notes: formNotes || null
        })
      })

      if (res.ok) {
        setConsumeOpen(false)
        fetchLedger()
      }
    } finally {
      setSaving(false)
    }
  }

  const openConsume = () => {
    setFormWallet('')
    setFormAmount(1)
    setFormMember('')
    setFormAsset('')
    setFormProject('')
    setFormTaskId('')
    setFormNotes('')
    setConsumeOpen(true)
  }

  const entries = data?.entries ?? []
  const summary = data?.summary
  const hasFilters = Boolean(filterWallet || filterMember)

  return (
    <>
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Registro de consumo'
          subheader={summary ? `${summary.totalEntries} movimientos · ${summary.totalDebits} débitos · ${summary.totalCredits} créditos` : undefined}
          avatar={
            <CustomAvatar variant='rounded' skin='light' color='warning' size={40}>
              <i className='tabler-receipt' style={{ fontSize: 22 }} />
            </CustomAvatar>
          }
          action={
            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openConsume}>
              Registrar consumo
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {/* Filters */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField
                select fullWidth size='small' label='Miembro'
                value={filterMember} onChange={e => setFilterMember(e.target.value)}
              >
                <MenuItem value=''>Todos los miembros</MenuItem>
                {(meta?.activeMembers ?? []).map(m => (
                  <MenuItem key={m.memberId} value={m.memberId}>{m.displayName}</MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <CustomTextField
                fullWidth size='small' label='Wallet ID'
                value={filterWallet} onChange={e => setFilterWallet(e.target.value)}
                placeholder='Filtrar por wallet...'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              {hasFilters && (
                <Button
                  variant='tonal' color='secondary' size='small' fullWidth
                  onClick={() => { setFilterWallet(''); setFilterMember('') }}
                  startIcon={<i className='tabler-filter-off' />}
                  sx={{ height: 40 }}
                >
                  Limpiar
                </Button>
              )}
            </Grid>
          </Grid>

          {loading ? (
            <Stack spacing={1}>
              {[0, 1, 2, 3, 4].map(i => (
                <Skeleton key={i} variant='rounded' height={44} />
              ))}
            </Stack>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Fecha</TableCell>
                    <TableCell align='center' sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Tipo</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Créditos</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Balance</TableCell>
                    <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Miembro</TableCell>
                    <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Asset / Descripción</TableCell>
                    <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Proyecto</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Costo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map(entry => {
                    const typeConf = ledgerEntryTypeConfig[entry.entryType]
                    const isDebit = entry.entryType === 'debit'

                    return (
                      <TableRow key={entry.ledgerId} hover>
                        <TableCell>
                          <Typography variant='body2' color='text.secondary' sx={{ whiteSpace: 'nowrap' }}>
                            {formatTimestamp(entry.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <CustomChip
                            round='true' size='small' variant='tonal'
                            icon={<i className={typeConf?.icon ?? 'tabler-circle'} />}
                            label={typeConf?.label ?? entry.entryType}
                            color={typeConf?.color === 'default' ? 'secondary' : typeConf?.color ?? 'secondary'}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <Typography
                            variant='body2'
                            sx={{
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              color: isDebit ? 'error.main' : 'success.main'
                            }}
                          >
                            {isDebit ? '-' : '+'}{entry.creditAmount}
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }} color='text.secondary'>
                            {entry.balanceAfter}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2'>{entry.consumedByName ?? '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ maxWidth: 200 }}>
                            <Typography variant='body2' sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {entry.assetDescription ?? entry.reloadReason ?? '—'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' color='text.secondary'>
                            {entry.projectName ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }} color='text.secondary'>
                            {formatCost(entry.totalCost, entry.costCurrency)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 8, border: 0 }}>
                        <Stack alignItems='center' spacing={2}>
                          <CustomAvatar variant='rounded' skin='light' color='warning' size={56}>
                            <i className='tabler-receipt' style={{ fontSize: 28 }} />
                          </CustomAvatar>
                          <Typography variant='h6' color='text.secondary'>Sin movimientos</Typography>
                          <Typography variant='body2' color='text.disabled' sx={{ maxWidth: 360, textAlign: 'center' }}>
                            Los consumos y recargas de créditos aparecerán aquí al registrar operaciones.
                          </Typography>
                          <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openConsume}>
                            Registrar primer consumo
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Consume Dialog */}
      <Dialog open={consumeOpen} onClose={() => !saving && setConsumeOpen(false)} maxWidth='sm' fullWidth closeAfterTransition={false}>
        <DialogTitle>
          <Stack direction='row' spacing={2} alignItems='center'>
            <CustomAvatar variant='rounded' skin='light' color='warning' size={36}>
              <i className='tabler-receipt' style={{ fontSize: 20 }} />
            </CustomAvatar>
            <Box>
              <Typography variant='h6'>Registrar consumo</Typography>
              <Typography variant='caption' color='text.secondary'>Debita créditos de un wallet</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <CustomTextField
              fullWidth size='small' label='Wallet ID'
              value={formWallet} onChange={e => setFormWallet(e.target.value)}
              required helperText='ID del wallet a debitar'
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <CustomTextField
                  fullWidth size='small' label='Créditos' type='number'
                  value={formAmount} onChange={e => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <CustomTextField
                  select fullWidth size='small' label='Consumido por'
                  value={formMember} onChange={e => setFormMember(e.target.value)}
                  required
                >
                  {(meta?.activeMembers ?? []).length === 0 && <MenuItem disabled value=''>Sin miembros disponibles</MenuItem>}
                  {(meta?.activeMembers ?? []).map(m => (
                    <MenuItem key={m.memberId} value={m.memberId}>{m.displayName}</MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
            </Grid>
            <CustomTextField
              fullWidth size='small' label='Descripción del asset'
              value={formAsset} onChange={e => setFormAsset(e.target.value)}
              required helperText='Qué se generó con estos créditos'
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth size='small' label='Nombre del proyecto'
                  value={formProject} onChange={e => setFormProject(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth size='small' label='Notion Task ID'
                  value={formTaskId} onChange={e => setFormTaskId(e.target.value)}
                  helperText='Para trazabilidad con Notion'
                />
              </Grid>
            </Grid>
            <CustomTextField
              fullWidth size='small' label='Notas'
              value={formNotes} onChange={e => setFormNotes(e.target.value)}
              multiline rows={2}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 4, py: 2.5 }}>
          <Button variant='tonal' color='secondary' onClick={() => setConsumeOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant='contained' onClick={handleConsume} disabled={saving || !formWallet || !formMember || !formAsset || !formAmount}>
            {saving ? 'Registrando...' : 'Registrar consumo'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AiConsumptionTab
