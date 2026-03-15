'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
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

import { CardStatsSquare } from '@/components/card-statistics'
import type { MemberToolLicense, AiCreditLedgerEntry } from '@/types/ai-tools'
import {
  licenseStatusConfig,
  accessLevelConfig,
  ledgerEntryTypeConfig,
  formatDate,
  formatTimestamp
} from '@views/greenhouse/ai-tools/helpers'

type Props = {
  memberId: string
}

const PersonAiToolsTab = ({ memberId }: Props) => {
  const [loading, setLoading] = useState(true)
  const [licenses, setLicenses] = useState<MemberToolLicense[]>([])
  const [ledger, setLedger] = useState<AiCreditLedgerEntry[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)

    const [licRes, ledRes] = await Promise.all([
      fetch(`/api/ai-tools/licenses?memberId=${memberId}`),
      fetch(`/api/ai-credits/ledger?memberId=${memberId}&limit=20`)
    ])

    if (licRes.ok) {
      const d = await licRes.json()

      setLicenses(d.licenses ?? [])
    }

    if (ledRes.ok) {
      const d = await ledRes.json()

      setLedger(d.entries ?? [])
    }

    setLoading(false)
  }, [memberId])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <Grid container spacing={6}>
        {[0, 1, 2].map(i => (
          <Grid size={{ xs: 12, sm: 4 }} key={i}>
            <Skeleton variant='rounded' height={90} />
          </Grid>
        ))}
        <Grid size={{ xs: 12 }}>
          <Skeleton variant='rounded' height={250} />
        </Grid>
      </Grid>
    )
  }

  const activeLicenses = licenses.filter(l => l.licenseStatus === 'active')
  const uniqueTools = new Set(licenses.map(l => l.toolId))
  const totalCreditsConsumed = ledger.filter(e => e.entryType === 'debit').reduce((sum, e) => sum + e.creditAmount, 0)

  return (
    <Grid container spacing={6}>
      {/* KPIs */}
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatsSquare
          stats={String(licenses.length)}
          statsTitle='Licencias'
          avatarIcon='tabler-key'
          avatarColor='info'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatsSquare
          stats={String(uniqueTools.size)}
          statsTitle='Herramientas'
          avatarIcon='tabler-wand'
          avatarColor='primary'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <CardStatsSquare
          stats={String(totalCreditsConsumed)}
          statsTitle='Créditos usados'
          avatarIcon='tabler-coins'
          avatarColor='warning'
        />
      </Grid>

      {/* Licenses */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Licencias asignadas'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i className='tabler-key' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            {licenses.length === 0 ? (
              <Stack alignItems='center' spacing={1} sx={{ py: 6 }}>
                <i className='tabler-key' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                <Typography color='text.secondary'>Sin licencias AI asignadas.</Typography>
                <Typography variant='caption' color='text.disabled'>
                  Este colaborador no tiene herramientas AI configuradas.
                </Typography>
              </Stack>
            ) : (
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Herramienta</TableCell>
                      <TableCell align='center'>Acceso</TableCell>
                      <TableCell>Email cuenta</TableCell>
                      <TableCell align='center'>Estado</TableCell>
                      <TableCell>Asignado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {licenses.map(lic => {
                      const statusConf = licenseStatusConfig[lic.licenseStatus]
                      const accessConf = accessLevelConfig[lic.accessLevel]

                      return (
                        <TableRow key={lic.licenseId} hover>
                          <TableCell>
                            <Typography variant='body2' fontWeight={500}>
                              {lic.tool?.toolName ?? lic.toolId}
                            </Typography>
                          </TableCell>
                          <TableCell align='center'>
                            <CustomChip
                              round='true' size='small'
                              icon={<i className={accessConf?.icon ?? 'tabler-shield'} />}
                              label={accessConf?.label ?? lic.accessLevel}
                              color={accessConf?.color === 'default' ? 'secondary' : accessConf?.color ?? 'secondary'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary'>
                              {lic.accountEmail ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align='center'>
                            <CustomChip
                              round='true' size='small'
                              icon={<i className={statusConf?.icon ?? 'tabler-circle'} />}
                              label={statusConf?.label ?? lic.licenseStatus}
                              color={statusConf?.color === 'default' ? 'secondary' : statusConf?.color ?? 'secondary'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary'>
                              {formatDate(lic.activatedAt ?? lic.createdAt)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Consumption */}
      {ledger.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Consumo atribuido'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                  <i className='tabler-receipt' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell align='center'>Tipo</TableCell>
                      <TableCell align='right'>Créditos</TableCell>
                      <TableCell>Asset</TableCell>
                      <TableCell>Proyecto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ledger.map(entry => {
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
                          <TableCell>
                            <Box sx={{ maxWidth: 180 }}>
                              <Typography variant='body2' sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {entry.assetDescription ?? '—'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary'>
                              {entry.projectName ?? '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default PersonAiToolsTab
