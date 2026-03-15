'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
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

  return (
    <>
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Registro de consumo'
          subheader={summary ? `${summary.totalEntries} movimientos · ${summary.totalDebits} débitos · ${summary.totalCredits} créditos` : undefined}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
              <i className='tabler-receipt' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
            </Avatar>
          }
          action={
            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openConsume}>
              Registrar consumo
            </Button>
          }
        />
        <Divider />
        <CardContent>
          <Stack direction='row' spacing={2} sx={{ mb: 3 }} flexWrap='wrap'>
            <CustomTextField
              select size='small' label='Miembro'
              value={filterMember} onChange={e => setFilterMember(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value=''>Todos</MenuItem>
              {(meta?.activeMembers ?? []).map(m => (
                <MenuItem key={m.memberId} value={m.memberId}>{m.displayName}</MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              size='small' label='Wallet ID'
              value={filterWallet} onChange={e => setFilterWallet(e.target.value)}
              sx={{ width: 220 }}
              placeholder='Filtrar por wallet...'
            />
          </Stack>

          {loading ? (
            <Skeleton variant='rounded' height={300} />
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell align='center'>Tipo</TableCell>
                    <TableCell align='right'>Créditos</TableCell>
                    <TableCell align='right'>Balance</TableCell>
                    <TableCell>Miembro</TableCell>
                    <TableCell>Asset / Descripción</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell align='right'>Costo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map(entry => {
                    const typeConf = ledgerEntryTypeConfig[entry.entryType]
                    const isDebit = entry.entryType === 'debit'

                    return (
                      <TableRow key={entry.ledgerId} hover>
                        <TableCell>
                          <Typography variant='body2' color='text.secondary'>
                            {formatTimestamp(entry.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <CustomChip
                            round='true' size='small'
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
                          <Typography variant='body2' sx={{ fontFamily: 'monospace' }} color='text.secondary'>
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
                          <Typography variant='body2' sx={{ fontFamily: 'monospace' }} color='text.secondary'>
                            {formatCost(entry.totalCost, entry.costCurrency)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align='center' sx={{ py: 6 }}>
                        <Stack alignItems='center' spacing={1}>
                          <i className='tabler-receipt' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                          <Typography color='text.secondary'>No hay movimientos registrados.</Typography>
                          <Typography variant='caption' color='text.disabled'>
                            Los consumos y recargas aparecerán aquí.
                          </Typography>
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
        <DialogTitle>Registrar consumo</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <CustomTextField
              fullWidth size='small' label='Wallet ID'
              value={formWallet} onChange={e => setFormWallet(e.target.value)}
              required helperText='ID del wallet a debitar'
            />
            <Stack direction='row' spacing={2}>
              <CustomTextField
                size='small' label='Créditos' type='number'
                value={formAmount} onChange={e => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                required sx={{ width: 120 }}
              />
              <CustomTextField
                select size='small' label='Consumido por'
                value={formMember} onChange={e => setFormMember(e.target.value)}
                required sx={{ flex: 1 }}
              >
                {(meta?.activeMembers ?? []).map(m => (
                  <MenuItem key={m.memberId} value={m.memberId}>{m.displayName}</MenuItem>
                ))}
              </CustomTextField>
            </Stack>
            <CustomTextField
              fullWidth size='small' label='Descripción del asset'
              value={formAsset} onChange={e => setFormAsset(e.target.value)}
              required helperText='Qué se generó con estos créditos'
            />
            <CustomTextField
              fullWidth size='small' label='Nombre del proyecto'
              value={formProject} onChange={e => setFormProject(e.target.value)}
            />
            <CustomTextField
              fullWidth size='small' label='Notion Task ID'
              value={formTaskId} onChange={e => setFormTaskId(e.target.value)}
              helperText='Opcional. Para trazabilidad con Notion'
            />
            <CustomTextField
              fullWidth size='small' label='Notas'
              value={formNotes} onChange={e => setFormNotes(e.target.value)}
              multiline rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
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
