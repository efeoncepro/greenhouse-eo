'use client'

import { useState } from 'react'

import dynamic from 'next/dynamic'

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
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import { getMicrocopy } from '@/lib/copy'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type { AiCreditWallet, AiTool, AiToolingAdminMetadata, ReloadReason } from '@/types/ai-tools'
import { walletStatusConfig, balanceHealthConfig, walletScopeLabel, reloadReasonLabel, formatDate } from '../helpers'

const GREENHOUSE_COPY = getMicrocopy()

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  wallets: AiCreditWallet[]
  tools: AiTool[]
  meta: AiToolingAdminMetadata | null
  onRefresh: () => void
}

const AiWalletsTab = ({ wallets, tools, meta, onRefresh }: Props) => {
  const theme = useTheme()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [reloadOpen, setReloadOpen] = useState(false)
  const [editWallet, setEditWallet] = useState<AiCreditWallet | null>(null)
  const [reloadWallet, setReloadWallet] = useState<AiCreditWallet | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')

  // Create form
  const [formScope, setFormScope] = useState('client')
  const [formClient, setFormClient] = useState('')
  const [formTool, setFormTool] = useState('')
  const [formBalance, setFormBalance] = useState<number | ''>(100)
  const [formMonthlyLimit, setFormMonthlyLimit] = useState<number | ''>('')
  const [formResetDay, setFormResetDay] = useState<number | ''>(1)
  const [formThreshold, setFormThreshold] = useState<number | ''>('')
  const [formValidFrom, setFormValidFrom] = useState('')
  const [formValidUntil, setFormValidUntil] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Edit form
  const [editMonthlyLimit, setEditMonthlyLimit] = useState<number | ''>('')
  const [editResetDay, setEditResetDay] = useState<number | ''>(1)
  const [editThreshold, setEditThreshold] = useState<number | ''>('')
  const [editValidFrom, setEditValidFrom] = useState('')
  const [editValidUntil, setEditValidUntil] = useState('')
  const [editStatus, setEditStatus] = useState('active')
  const [editNotes, setEditNotes] = useState('')

  // Reload form
  const [reloadAmount, setReloadAmount] = useState<number | ''>(0)
  const [reloadReason, setReloadReasonState] = useState<ReloadReason>('purchase')
  const [reloadRef, setReloadRef] = useState('')
  const [reloadNotes, setReloadNotes] = useState('')

  const openCreate = () => {
    setFormScope('client')
    setFormClient('')
    setFormTool('')
    setFormBalance(100)
    setFormMonthlyLimit('')
    setFormResetDay(1)
    setFormThreshold('')
    setFormValidFrom('')
    setFormValidUntil('')
    setFormNotes('')
    setCreateOpen(true)
  }

  const openReload = (wallet: AiCreditWallet) => {
    setReloadWallet(wallet)
    setReloadAmount(0)
    setReloadReasonState('purchase')
    setReloadRef('')
    setReloadNotes('')
    setReloadOpen(true)
  }

  const openEdit = (wallet: AiCreditWallet) => {
    setEditWallet(wallet)
    setEditMonthlyLimit(wallet.monthlyLimit ?? '')
    setEditResetDay(wallet.monthlyResetDay ?? 1)
    setEditThreshold(wallet.lowBalanceThreshold ?? '')
    setEditValidFrom(wallet.validFrom)
    setEditValidUntil(wallet.validUntil ?? '')
    setEditStatus(wallet.walletStatus)
    setEditNotes(wallet.notes ?? '')
    setEditOpen(true)
  }

  const handleCreate = async () => {
    setSaving(true)

    try {
      const res = await fetch('/api/admin/ai-tools/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletScope: formScope,
          clientId: formScope === 'client' ? formClient : null,
          toolId: formTool,
          initialBalance: formBalance === '' ? 0 : formBalance,
          monthlyLimit: formMonthlyLimit === '' ? null : formMonthlyLimit,
          monthlyResetDay: formResetDay === '' ? 1 : formResetDay,
          lowBalanceThreshold: formThreshold === '' ? null : formThreshold,
          validFrom: formValidFrom,
          validUntil: formValidUntil || null,
          notes: formNotes || null
        })
      })

      if (res.ok) {
        setCreateOpen(false)
        onRefresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleReload = async () => {
    if (!reloadWallet) return
    setSaving(true)

    try {
      const res = await fetch('/api/ai-credits/reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId: reloadWallet.walletId,
          creditAmount: reloadAmount === '' ? 0 : reloadAmount,
          reloadReason,
          reloadReference: reloadRef || null,
          notes: reloadNotes || null
        })
      })

      if (res.ok) {
        setReloadOpen(false)
        onRefresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editWallet) return
    setSaving(true)

    try {
      const res = await fetch(`/api/admin/ai-tools/wallets/${editWallet.walletId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyLimit: editMonthlyLimit === '' ? null : editMonthlyLimit,
          monthlyResetDay: editResetDay === '' ? 1 : editResetDay,
          lowBalanceThreshold: editThreshold === '' ? null : editThreshold,
          validFrom: editValidFrom,
          validUntil: editValidUntil || null,
          walletStatus: editStatus,
          notes: editNotes || null
        })
      })

      if (res.ok) {
        setEditOpen(false)
        onRefresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const filtered = wallets.filter(w => {
    if (filterStatus && w.walletStatus !== filterStatus) return false
    if (filterClient && w.clientId !== filterClient) return false

return true
  })

  const healthColor = (health: string) => {
    const conf = balanceHealthConfig[health as keyof typeof balanceHealthConfig]


return conf?.color === 'default' ? 'secondary' : conf?.color ?? 'secondary'
  }

  const themeColor = (health: string) => {
    const c = healthColor(health)
    const paletteEntry = theme.palette[c as keyof typeof theme.palette]

    if (paletteEntry && typeof paletteEntry === 'object' && 'main' in paletteEntry) {
      return (paletteEntry as { main: string }).main
    }


return theme.palette.secondary.main
  }

  const hasFilters = Boolean(filterStatus || filterClient)

  return (
    <>
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Wallets de créditos AI'
          subheader={wallets.length > 0 ? `${wallets.length} wallets configurados` : undefined}
          avatar={
            <CustomAvatar variant='rounded' skin='light' color='success' size={40}>
              <i className='tabler-wallet' style={{ fontSize: 22 }} />
            </CustomAvatar>
          }
          action={
            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
              Crear wallet
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {/* Filters */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField
                select fullWidth size='small' label='Estado'
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              >
                <MenuItem value=''>Todos los estados</MenuItem>
                {(meta?.walletStatuses ?? Object.keys(walletStatusConfig)).map(s => (
                  <MenuItem key={s} value={s}>
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <i className={walletStatusConfig[s as keyof typeof walletStatusConfig]?.icon ?? 'tabler-circle'} style={{ fontSize: 16 }} />
                      <span>{walletStatusConfig[s as keyof typeof walletStatusConfig]?.label ?? s}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <CustomTextField
                select fullWidth size='small' label='Cliente'
                value={filterClient} onChange={e => setFilterClient(e.target.value)}
              >
                <MenuItem value=''>Todos los clientes</MenuItem>
                {(meta?.activeClients ?? []).map(c => (
                  <MenuItem key={c.clientId} value={c.clientId}>{c.clientName}</MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              {hasFilters && (
                <Button
                  variant='tonal' color='secondary' size='small' fullWidth
                  onClick={() => { setFilterStatus(''); setFilterClient('') }}
                  startIcon={<i className='tabler-filter-off' />}
                  sx={{ height: 40 }}
                >
                  Limpiar
                </Button>
              )}
            </Grid>
          </Grid>

          {filtered.length === 0 ? (
            <Stack alignItems='center' spacing={2} sx={{ py: 8 }}>
              <CustomAvatar variant='rounded' skin='light' color='success' size={56}>
                <i className='tabler-wallet' style={{ fontSize: 28 }} />
              </CustomAvatar>
              {hasFilters ? (
                <>
                  <Typography variant='h6' color='text.secondary'>{GREENHOUSE_COPY.empty.noResults}</Typography>
                  <Typography variant='body2' color='text.disabled'>
                    No hay wallets que coincidan con los filtros.
                  </Typography>
                  <Button
                    variant='tonal' size='small'
                    onClick={() => { setFilterStatus(''); setFilterClient('') }}
                    startIcon={<i className='tabler-filter-off' />}
                  >
                    Limpiar filtros
                  </Button>
                </>
              ) : (
                <>
                  <Typography variant='h6' color='text.secondary'>Sin wallets configurados</Typography>
                  <Typography variant='body2' color='text.disabled' sx={{ maxWidth: 360, textAlign: 'center' }}>
                    Crea un wallet para asignar créditos a un cliente o pool interno y gestionar el consumo de herramientas AI.
                  </Typography>
                  <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
                    Crear primer wallet
                  </Button>
                </>
              )}
            </Stack>
          ) : (
            <Grid container spacing={4}>
              {filtered.map(wallet => {
                const healthConf = balanceHealthConfig[wallet.balanceHealth]
                const statusConf = walletStatusConfig[wallet.walletStatus]
                const gaugeColor = themeColor(wallet.balanceHealth)
                const usedPercent = Math.min(100, Math.round(wallet.usagePercent))

                const chartOptions: ApexOptions = {
                  chart: { parentHeightOffset: 0, sparkline: { enabled: true } },
                  colors: [gaugeColor],
                  plotOptions: {
                    radialBar: {
                      startAngle: -90,
                      endAngle: 90,
                      hollow: { size: '60%' },
                      track: { background: theme.palette.action.hover },
                      dataLabels: {
                        name: { show: false },
                        value: {
                          show: true,
                          fontSize: '14px',
                          fontWeight: 600,
                          offsetY: -2,
                          formatter: () => `${wallet.availableBalance} / ${wallet.initialBalance}`
                        }
                      }
                    }
                  },
                  stroke: { lineCap: 'round' }
                }

                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={wallet.walletId}>
                    <Card
                      elevation={0}
                      sx={{
                        border: t => `1px solid ${t.palette.divider}`,
                        borderTop: '3px solid',
                        borderTopColor: gaugeColor,
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: theme.shadows[4] }
                      }}
                    >
                      <CardContent>
                        {/* Header */}
                        <Stack direction='row' justifyContent='space-between' alignItems='flex-start' sx={{ mb: 1 }}>
                          <Stack direction='row' spacing={1.5} alignItems='center'>
                            <CustomAvatar variant='rounded' skin='light' color={statusConf?.color === 'default' ? 'secondary' : statusConf?.color ?? 'success'} size={32}>
                              <i className='tabler-wallet' style={{ fontSize: 18 }} />
                            </CustomAvatar>
                            <Box>
                              <Typography variant='subtitle2' fontWeight={600}>{wallet.toolName}</Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {wallet.providerName ?? '—'}
                              </Typography>
                            </Box>
                          </Stack>
                          <CustomChip
                            round='true' size='small' variant='tonal'
                            icon={<i className={statusConf?.icon ?? 'tabler-circle'} />}
                            label={statusConf?.label ?? wallet.walletStatus}
                            color={statusConf?.color === 'default' ? 'secondary' : statusConf?.color ?? 'secondary'}
                          />
                        </Stack>

                        {/* Gauge */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                          <AppReactApexCharts
                            type='radialBar'
                            height={140}
                            options={chartOptions}
                            series={[100 - usedPercent]}
                            width={180}
                          />
                        </Box>

                        {/* Health chip */}
                        <Stack alignItems='center' sx={{ mb: 2 }}>
                          <CustomChip
                            round='true' size='small' variant='tonal'
                            icon={<i className={healthConf?.icon ?? 'tabler-circle'} />}
                            label={healthConf?.label ?? wallet.balanceHealth}
                            color={healthConf?.color === 'default' ? 'secondary' : healthConf?.color ?? 'secondary'}
                          />
                        </Stack>

                        {/* Monthly progress */}
                        {wallet.monthlyLimit != null && wallet.monthlyLimit > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Stack direction='row' justifyContent='space-between' sx={{ mb: 0.5 }}>
                              <Typography variant='caption' color='text.secondary'>Consumo mensual</Typography>
                              <Typography variant='caption'>
                                {wallet.monthlyConsumed} / {wallet.monthlyLimit}
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant='determinate'
                              value={Math.min(100, (wallet.monthlyConsumed / wallet.monthlyLimit) * 100)}
                              color={healthColor(wallet.balanceHealth) as 'success' | 'warning' | 'error' | 'secondary'}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        )}

                        {/* Info rows */}
                        <Divider sx={{ my: 1.5 }} />
                        <Stack spacing={0.5} sx={{ mb: 2 }}>
                          <Stack direction='row' justifyContent='space-between' alignItems='center'>
                            <Typography variant='caption' color='text.secondary'>
                              <i className='tabler-target' style={{ fontSize: 14, verticalAlign: 'text-bottom', marginRight: 4 }} />
                              Alcance
                            </Typography>
                            <CustomChip round='true' size='small' variant='tonal' label={wallet.clientName ?? walletScopeLabel[wallet.walletScope] ?? 'Pool'} color={wallet.walletScope === 'client' ? 'info' : 'secondary'} />
                          </Stack>
                          <Stack direction='row' justifyContent='space-between'>
                            <Typography variant='caption' color='text.secondary'>
                              <i className='tabler-coins' style={{ fontSize: 14, verticalAlign: 'text-bottom', marginRight: 4 }} />
                              Unidad
                            </Typography>
                            <Typography variant='caption' fontWeight={500}>{wallet.creditUnitName}</Typography>
                          </Stack>
                          <Stack direction='row' justifyContent='space-between'>
                            <Typography variant='caption' color='text.secondary'>
                              <i className='tabler-calendar' style={{ fontSize: 14, verticalAlign: 'text-bottom', marginRight: 4 }} />
                              Vigencia
                            </Typography>
                            <Typography variant='caption'>{formatDate(wallet.validFrom)} — {formatDate(wallet.validUntil)}</Typography>
                          </Stack>
                        </Stack>

                        {/* Actions */}
                        <Stack direction='row' spacing={1}>
                          <Button variant='tonal' size='small' color='success' fullWidth onClick={() => openReload(wallet)} startIcon={<i className='tabler-plus' />}>
                            Recargar
                          </Button>
                          <Button variant='tonal' size='small' color='secondary' fullWidth onClick={() => openEdit(wallet)} startIcon={<i className='tabler-pencil' />}>{GREENHOUSE_COPY.actions.edit}</Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )}

          {filtered.length > 0 && (
            <Typography variant='caption' color='text.disabled' sx={{ mt: 3, display: 'block' }}>
              Mostrando {filtered.length} de {wallets.length} wallets
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Create Wallet Dialog */}
      <Dialog open={createOpen} onClose={() => !saving && setCreateOpen(false)} maxWidth='sm' fullWidth closeAfterTransition={false}>
        <DialogTitle>
          <Stack direction='row' spacing={2} alignItems='center'>
            <CustomAvatar variant='rounded' skin='light' color='success' size={36}>
              <i className='tabler-wallet' style={{ fontSize: 20 }} />
            </CustomAvatar>
            <Box>
              <Typography variant='h6'>Crear wallet</Typography>
              <Typography variant='caption' color='text.secondary'>Asigna créditos a un cliente o pool interno</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <CustomTextField
              select fullWidth size='small' label='Alcance'
              value={formScope} onChange={e => setFormScope(e.target.value)}
              required
            >
              {(meta?.walletScopes ?? ['client', 'pool']).map(s => (
                <MenuItem key={s} value={s}>{walletScopeLabel[s] ?? s}</MenuItem>
              ))}
            </CustomTextField>
            {formScope === 'client' && (
              <CustomTextField
                select fullWidth size='small' label='Cliente'
                value={formClient} onChange={e => setFormClient(e.target.value)}
                required
              >
                {(meta?.activeClients ?? []).length === 0 && <MenuItem disabled value=''>Sin clientes activos</MenuItem>}
                {(meta?.activeClients ?? []).map(c => (
                  <MenuItem key={c.clientId} value={c.clientId}>{c.clientName}</MenuItem>
                ))}
              </CustomTextField>
            )}
            <CustomTextField
              select fullWidth size='small' label='Herramienta'
              value={formTool} onChange={e => setFormTool(e.target.value)}
              required
            >
              {tools.length === 0 && <MenuItem value='' disabled>Sin herramientas disponibles</MenuItem>}
              {tools
                .filter(tool => tool.isActive)
                .map(tool => (
                  <MenuItem key={tool.toolId} value={tool.toolId}>{tool.toolName}</MenuItem>
                ))}
            </CustomTextField>
            <Divider><CustomChip round='true' size='small' label='Configuración' color='secondary' variant='tonal' /></Divider>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth size='small' label='Balance inicial' type='number'
                  value={formBalance} onChange={e => setFormBalance(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth size='small' label='Límite mensual' type='number'
                  value={formMonthlyLimit} onChange={e => setFormMonthlyLimit(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth size='small' label='Día reset mensual' type='number'
                  value={formResetDay} onChange={e => setFormResetDay(e.target.value === '' ? '' : Number(e.target.value))}
                  helperText='1-28'
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth size='small' label='Umbral bajo' type='number'
                  value={formThreshold} onChange={e => setFormThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                  helperText='Alerta de balance bajo'
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth size='small' label='Válido desde' type='date'
                  value={formValidFrom} onChange={e => setFormValidFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }} required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth size='small' label='Válido hasta' type='date'
                  value={formValidUntil} onChange={e => setFormValidUntil(e.target.value)}
                  InputLabelProps={{ shrink: true }}
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
          <Button variant='tonal' color='secondary' onClick={() => setCreateOpen(false)} disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={handleCreate} disabled={saving || !formTool || !formValidFrom || (formScope === 'client' && !formClient)}>
            {saving ? 'Creando...' : 'Crear wallet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Wallet Dialog */}
      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} maxWidth='sm' fullWidth closeAfterTransition={false}>
        <DialogTitle>
          <Stack direction='row' spacing={2} alignItems='center'>
            <CustomAvatar variant='rounded' skin='light' color='success' size={36}>
              <i className='tabler-pencil' style={{ fontSize: 20 }} />
            </CustomAvatar>
            <Box>
              <Typography variant='h6'>Editar wallet</Typography>
              <Typography variant='caption' color='text.secondary'>
                {editWallet ? `${editWallet.toolName} · ${editWallet.clientName ?? 'Pool interno'}` : ''}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {editWallet && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Stack direction='row' spacing={1} alignItems='center'>
                  <CustomAvatar variant='rounded' skin='light' color='success' size={28}>
                    <i className='tabler-wallet' style={{ fontSize: 16 }} />
                  </CustomAvatar>
                  <Box>
                    <Typography variant='subtitle2'>{editWallet.toolName}</Typography>
                    <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.75rem' }}>
                      {editWallet.walletId}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth size='small' label='Límite mensual' type='number'
                    value={editMonthlyLimit} onChange={e => setEditMonthlyLimit(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth size='small' label='Día reset mensual' type='number'
                    value={editResetDay} onChange={e => setEditResetDay(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </Grid>
              </Grid>
              <CustomTextField
                fullWidth size='small' label='Umbral bajo' type='number'
                value={editThreshold} onChange={e => setEditThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                helperText='Alerta de balance bajo'
              />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth size='small' label='Válido desde' type='date'
                    value={editValidFrom} onChange={e => setEditValidFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }} required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth size='small' label='Válido hasta' type='date'
                    value={editValidUntil} onChange={e => setEditValidUntil(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              <CustomTextField
                select fullWidth size='small' label='Estado'
                value={editStatus} onChange={e => setEditStatus(e.target.value)}
              >
                {(meta?.walletStatuses ?? Object.keys(walletStatusConfig)).map(status => (
                  <MenuItem key={status} value={status}>
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <i className={walletStatusConfig[status as keyof typeof walletStatusConfig]?.icon ?? 'tabler-circle'} style={{ fontSize: 16 }} />
                      <span>{walletStatusConfig[status as keyof typeof walletStatusConfig]?.label ?? status}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                fullWidth size='small' label='Notas'
                value={editNotes} onChange={e => setEditNotes(e.target.value)}
                multiline rows={2}
              />
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 4, py: 2.5 }}>
          <Button variant='tonal' color='secondary' onClick={() => setEditOpen(false)} disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={handleEdit} disabled={saving || !editValidFrom}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reload Dialog */}
      <Dialog open={reloadOpen} onClose={() => !saving && setReloadOpen(false)} maxWidth='xs' fullWidth closeAfterTransition={false}>
        <DialogTitle>
          <Stack direction='row' spacing={2} alignItems='center'>
            <CustomAvatar variant='rounded' skin='light' color='success' size={36}>
              <i className='tabler-plus' style={{ fontSize: 20 }} />
            </CustomAvatar>
            <Box>
              <Typography variant='h6'>Recargar wallet</Typography>
              <Typography variant='caption' color='text.secondary'>Agrega créditos al wallet</Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {reloadWallet && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Stack direction='row' spacing={1} alignItems='center'>
                  <CustomAvatar variant='rounded' skin='light' color='success' size={28}>
                    <i className='tabler-wallet' style={{ fontSize: 16 }} />
                  </CustomAvatar>
                  <Box>
                    <Typography variant='subtitle2'>{reloadWallet.toolName}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {reloadWallet.clientName ?? 'Pool interno'} · Balance: {reloadWallet.currentBalance} {reloadWallet.creditUnitName}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <CustomTextField
                fullWidth size='small' label='Cantidad de créditos' type='number'
                value={reloadAmount} onChange={e => setReloadAmount(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
              <CustomTextField
                select fullWidth size='small' label='Motivo'
                value={reloadReason} onChange={e => setReloadReasonState(e.target.value as ReloadReason)}
                required
              >
                {(meta?.reloadReasons ?? Object.keys(reloadReasonLabel)).map(r => (
                  <MenuItem key={r} value={r}>{reloadReasonLabel[r as keyof typeof reloadReasonLabel] ?? r}</MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                fullWidth size='small' label='Referencia'
                value={reloadRef} onChange={e => setReloadRef(e.target.value)}
                helperText='Ej: OC-IA-2026-031'
              />
              <CustomTextField
                fullWidth size='small' label='Notas'
                value={reloadNotes} onChange={e => setReloadNotes(e.target.value)}
                multiline rows={2}
              />
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 4, py: 2.5 }}>
          <Button variant='tonal' color='secondary' onClick={() => setReloadOpen(false)} disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' color='success' onClick={handleReload} disabled={saving || !reloadAmount}>
            {saving ? 'Recargando...' : 'Recargar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AiWalletsTab
